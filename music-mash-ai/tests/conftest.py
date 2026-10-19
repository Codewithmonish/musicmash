"""Shared pytest fixtures: an API client on a throwaway SQLite DB, a temporary upload dir, and the
AI coach knowledge base (fake embeddings by default, the real model for tests marked slow)."""
import hashlib
import re

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.database.database import Base, get_db
from app.services.coach.knowledge import KNOWLEDGE_DIR, KnowledgeBase, load_docs
from main import app

engine = create_engine("sqlite:///./test.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client() -> TestClient:
    """API client acting as user 1 (the X-User-Id header Spring sends). TestClient runs background
    tasks before returning, so an analysis submitted through it is already processed when the
    response arrives. Pass headers={"X-User-Id": "2"} on a request to act as someone else."""
    return TestClient(app, headers={"X-User-Id": "1"})


@pytest.fixture
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def upload_dir(tmp_path, monkeypatch):
    """Point the AI service's UPLOAD_DIR at an empty temporary folder."""
    folder = tmp_path / "uploads"
    folder.mkdir()
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(folder))
    return folder


@pytest.fixture
def write_upload(upload_dir):
    """Write a signal as a WAV into the upload dir and return its file name."""
    def write(signal: np.ndarray, name: str = "take.wav", sr: int = 22050) -> str:
        sf.write(upload_dir / name, signal, sr)
        return name
    return write


class FakeEmbedder:
    """Stand-in for sentence-transformers in the default test suite: no model download, instant.

    Each text becomes a bag of its lower-case words, hashed into 384 dimensions and L2-normalised,
    so texts sharing words get similar vectors. Good enough to test indexing and metadata filters;
    retrieval *quality* is tested with the real model in tests marked slow.
    """
    DIM = 384

    def encode(self, texts: list[str], normalize_embeddings: bool = True, **_) -> np.ndarray:
        vectors = np.zeros((len(texts), self.DIM))
        for row, text in enumerate(texts):
            for word in re.findall(r"[a-z]+", text.lower()):
                vectors[row, int(hashlib.md5(word.encode()).hexdigest(), 16) % self.DIM] += 1.0
            norm = np.linalg.norm(vectors[row])
            if norm:
                vectors[row] /= norm
        return vectors


@pytest.fixture(scope="session")
def kb(tmp_path_factory) -> KnowledgeBase:
    """The real knowledge docs in a temporary Chroma index, embedded with FakeEmbedder."""
    knowledge = KnowledgeBase(tmp_path_factory.mktemp("chroma_fake"), FakeEmbedder())
    knowledge.rebuild(load_docs(KNOWLEDGE_DIR))
    return knowledge


@pytest.fixture(scope="session")
def real_kb(tmp_path_factory) -> KnowledgeBase:
    """Same docs embedded with the real all-MiniLM-L6-v2 model (slow tests only)."""
    st = pytest.importorskip("sentence_transformers")
    try:
        model = st.SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    except Exception as e:  # first run needs the internet to download the model
        pytest.skip(f"embedding model not available: {e}")
    knowledge = KnowledgeBase(tmp_path_factory.mktemp("chroma_real"), model)
    knowledge.rebuild(load_docs(KNOWLEDGE_DIR))
    return knowledge
