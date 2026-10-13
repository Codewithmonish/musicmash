import pytest
from fastapi.testclient import TestClient
from main import app
from app.database.database import init_db, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.database import Base

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture
def setup_database():
    """Setup test database."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_root_endpoint():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert data["status"] == "running"


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_analyze_endpoint(setup_database):
    """Test analyze performance endpoint."""
    request_data = {
        "performance_id": 1,
        "user_id": 1,
        "audio_url": "http://example.com/audio.mp3",
        "video_url": "http://example.com/video.mp4",
        "instrument": "PIANO",
        "category": "CLASSICAL"
    }
    
    response = client.post("/api/ai/analyze", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["performance_id"] == 1
    assert data["user_id"] == 1
    assert data["status"] in ["PENDING", "PROCESSING"]


def test_analyze_endpoint_missing_fields(setup_database):
    """Test analyze endpoint with missing required fields."""
    request_data = {
        "performance_id": 1
        # Missing user_id
    }
    
    response = client.post("/api/ai/analyze", json=request_data)
    assert response.status_code == 422


def test_status_endpoint(setup_database):
    """Test get analysis status endpoint."""
    # First create an analysis
    request_data = {
        "performance_id": 1,
        "user_id": 1,
        "audio_url": "http://example.com/audio.mp3"
    }
    
    create_response = client.post("/api/ai/analyze", json=request_data)
    analysis_id = create_response.json()["id"]
    
    # Get status
    response = client.get(f"/api/ai/status/{analysis_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == analysis_id
    assert "status" in data


def test_status_endpoint_not_found(setup_database):
    """Test status endpoint with non-existent analysis."""
    response = client.get("/api/ai/status/99999")
    assert response.status_code == 404


def test_result_endpoint_not_completed(setup_database):
    """Test result endpoint when analysis not completed."""
    # Create an analysis
    request_data = {
        "performance_id": 1,
        "user_id": 1,
        "audio_url": "http://example.com/audio.mp3"
    }
    
    create_response = client.post("/api/ai/analyze", json=request_data)
    analysis_id = create_response.json()["id"]
    
    # Try to get result immediately (should not be completed yet)
    response = client.get(f"/api/ai/result/{analysis_id}")
    assert response.status_code == 400
