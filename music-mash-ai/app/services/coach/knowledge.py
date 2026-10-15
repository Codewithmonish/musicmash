"""The coach's knowledge base: practice docs in knowledge/*.md, chunked and stored in Chroma.

Each doc starts with front-matter:

    ---
    problem_tags: [intonation, sharp]
    instruments: [any]          # or e.g. [violin, vocals]
    level: all                  # beginner | intermediate | advanced | all
    ---

Chroma metadata values must be scalars, so list fields are stored as boolean flags
(tag_sharp=True, inst_violin=True) that `where` filters can match.
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Protocol

import chromadb

AI_ROOT = Path(__file__).resolve().parents[3]
KNOWLEDGE_DIR = AI_ROOT / "knowledge"
COLLECTION = "practice_knowledge"
MAX_CHUNK_CHARS = 1200

# Instruments that have their own docs; anything else only gets the "any" docs.
DOC_INSTRUMENTS = {"piano", "guitar", "violin", "vocals"}
LEVEL_RANK = {"beginner": 0, "intermediate": 1, "advanced": 2, "all": 0}
USER_LEVEL_RANK = {"BEGINNER": 0, "INTERMEDIATE": 1, "ADVANCED": 2, "PROFESSIONAL": 2, "EXPERT": 2}


class Embedder(Protocol):
    def encode(self, texts: list[str], **kwargs): ...


@dataclass
class KnowledgeDoc:
    doc_id: str           # file stem, e.g. "intonation-drone-practice"
    title: str
    problem_tags: list[str]
    instruments: list[str]
    level: str
    body: str             # markdown after the front-matter, title line removed


@dataclass
class Chunk:
    chunk_id: str
    doc: KnowledgeDoc
    text: str             # includes the doc title so every chunk stands on its own


@dataclass
class RetrievedChunk:
    doc_id: str
    title: str
    text: str
    distance: float       # cosine distance, 0 = identical


def _parse_value(raw: str) -> str | list[str]:
    raw = raw.strip()
    if raw.startswith("[") and raw.endswith("]"):
        return [item.strip() for item in raw[1:-1].split(",") if item.strip()]
    return raw


def parse_doc(path: Path) -> KnowledgeDoc:
    """Read one knowledge doc. Raises ValueError if the front-matter is missing a field."""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{path.name}: missing front-matter")
    header, body = text[4:].split("\n---\n", 1)
    meta = {}
    for line in header.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = _parse_value(value)
    for required in ("problem_tags", "instruments", "level"):
        if required not in meta:
            raise ValueError(f"{path.name}: front-matter has no '{required}'")
    lines = body.strip().splitlines()
    title = lines[0].lstrip("# ").strip() if lines and lines[0].startswith("# ") else path.stem
    return KnowledgeDoc(path.stem, title, list(meta["problem_tags"]), list(meta["instruments"]),
                        str(meta["level"]), "\n".join(lines[1:]).strip())


def load_docs(directory: Path = KNOWLEDGE_DIR) -> list[KnowledgeDoc]:
    return [parse_doc(p) for p in sorted(directory.glob("*.md"))]


def chunk_doc(doc: KnowledgeDoc, max_chars: int = MAX_CHUNK_CHARS) -> list[Chunk]:
    """Split on '## ' headings; sections are merged while they fit in max_chars.

    Docs are short, so most become one or two chunks. The intro paragraph stays with the
    first section so a chunk never loses the doc's context.
    """
    sections: list[str] = []
    for part in doc.body.split("\n## "):
        part = part if not sections else "## " + part
        if sections and len(sections[-1]) + len(part) + 2 <= max_chars:
            sections[-1] += "\n\n" + part
        else:
            sections.append(part)
    return [Chunk(f"{doc.doc_id}#{i}", doc, f"# {doc.title}\n\n{section.strip()}")
            for i, section in enumerate(sections)]


def chunk_metadata(chunk: Chunk) -> dict:
    meta = {"doc_id": chunk.doc.doc_id, "title": chunk.doc.title,
            "level_rank": LEVEL_RANK.get(chunk.doc.level, 0)}
    meta.update({f"tag_{t}": True for t in chunk.doc.problem_tags})
    meta.update({f"inst_{i}": True for i in chunk.doc.instruments})
    return meta


def instrument_key(instrument: Optional[str]) -> Optional[str]:
    """Spring/AI instrument name → doc instrument ("VOCALS" → "vocals"); None if no specific docs."""
    key = (instrument or "").strip().lower()
    return key if key in DOC_INSTRUMENTS else None


def build_filter(tag: str, instrument: Optional[str], level: Optional[str]) -> dict:
    """Chroma `where`: has the tag, is for any instrument or this one, and isn't above the user's level."""
    inst = instrument_key(instrument)
    instrument_clause = ({"$or": [{"inst_any": True}, {f"inst_{inst}": True}]} if inst
                         else {"inst_any": True})
    rank = USER_LEVEL_RANK.get((level or "").upper(), 2)
    return {"$and": [{f"tag_{tag}": True}, instrument_clause, {"level_rank": {"$lte": rank}}]}


class KnowledgeBase:
    """Chroma collection of embedded chunks. Embeddings are computed here with the given
    sentence-transformers model, so Chroma never downloads its own default model."""

    def __init__(self, persist_dir: Path, embedder: Embedder):
        self.client = chromadb.PersistentClient(path=str(persist_dir))
        self.embedder = embedder

    def _embed(self, texts: list[str]) -> list[list[float]]:
        return self.embedder.encode(texts, normalize_embeddings=True).tolist()

    def rebuild(self, docs: list[KnowledgeDoc]) -> int:
        """Drop and recreate the collection from docs. Returns the number of chunks stored."""
        if COLLECTION in [c.name for c in self.client.list_collections()]:
            self.client.delete_collection(COLLECTION)
        collection = self.client.create_collection(COLLECTION, metadata={"hnsw:space": "cosine"},
                                                   embedding_function=None)
        chunks = [c for d in docs for c in chunk_doc(d)]
        collection.add(ids=[c.chunk_id for c in chunks], documents=[c.text for c in chunks],
                       metadatas=[chunk_metadata(c) for c in chunks],
                       embeddings=self._embed([c.text for c in chunks]))
        return len(chunks)

    def is_built(self) -> bool:
        return COLLECTION in [c.name for c in self.client.list_collections()]

    def retrieve(self, query: str, tag: str, instrument: Optional[str] = None,
                 level: Optional[str] = None, k: int = 3) -> list[RetrievedChunk]:
        """Top-k chunks for the query among docs tagged `tag` that fit the instrument and level.

        At most one chunk per doc, so k results means k different docs. If the instrument has
        its own docs for this tag, the closest one is always included: general docs are longer
        and tend to win on similarity, but the instrument-specific tip is usually the most useful.
        """
        collection = self.client.get_collection(COLLECTION, embedding_function=None)
        embedding = self._embed([query])

        def query(where: dict, n: int) -> list[RetrievedChunk]:
            result = collection.query(query_embeddings=embedding, n_results=n, where=where,
                                      include=["documents", "metadatas", "distances"])
            return [RetrievedChunk(meta["doc_id"], meta["title"], text, float(distance))
                    for text, meta, distance in zip(result["documents"][0], result["metadatas"][0],
                                                    result["distances"][0])]

        where = build_filter(tag, instrument, level)
        candidates = query(where, k * 3)
        inst = instrument_key(instrument)
        if inst:
            specific_where = {"$and": [where["$and"][0], {f"inst_{inst}": True}, where["$and"][2]]}
            candidates = query(specific_where, 1) + candidates

        chunks: list[RetrievedChunk] = []
        for chunk in candidates:
            if chunk.doc_id not in {c.doc_id for c in chunks}:
                chunks.append(chunk)
        return sorted(chunks[:k], key=lambda c: c.distance)
