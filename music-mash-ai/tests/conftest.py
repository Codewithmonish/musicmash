"""Shared pytest fixtures: an API client on a throwaway SQLite DB and a temporary upload dir."""
import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.database.database import Base, get_db
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
    """API client. TestClient runs background tasks before returning, so an analysis
    submitted through it is already processed when the response arrives."""
    return TestClient(app)


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
