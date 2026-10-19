"""Build the AI coach's knowledge index: knowledge/*.md → chunks → embeddings → Chroma.

Run from music-mash-ai/ after changing any knowledge doc:

    .venv\\Scripts\\python scripts\\build_knowledge_index.py

The first run downloads the embedding model (all-MiniLM-L6-v2, about 90 MB) into the
Hugging Face cache. The index is written to CHROMA_DIR (default ./chroma_db, gitignored)
and replaced completely on every run.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sentence_transformers import SentenceTransformer  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.services.coach.knowledge import KNOWLEDGE_DIR, KnowledgeBase, chunk_doc, load_docs  # noqa: E402


def main() -> None:
    docs = load_docs(KNOWLEDGE_DIR)
    print(f"{len(docs)} docs in {KNOWLEDGE_DIR}")
    kb = KnowledgeBase(Path(settings.CHROMA_DIR), SentenceTransformer(settings.EMBEDDING_MODEL))
    count = kb.rebuild(docs)
    print(f"{count} chunks embedded with {settings.EMBEDDING_MODEL} -> {Path(settings.CHROMA_DIR).resolve()}")

    tags: dict[str, int] = {}
    for doc in docs:
        for tag in doc.problem_tags:
            tags[tag] = tags.get(tag, 0) + 1
    print("docs per problem tag:", ", ".join(f"{t} {n}" for t, n in sorted(tags.items())))
    print("longest chunk:", max(len(c.text) for d in docs for c in chunk_doc(d)), "chars")


if __name__ == "__main__":
    main()
