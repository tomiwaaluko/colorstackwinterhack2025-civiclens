"""Tests for the politicians endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_politician_by_id():
    """Test retrieving a politician by ID"""
    response = client.get("/politicians/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert "name" in data
    assert "party" in data
    assert "position" in data


def test_get_politician_not_found():
    """Test that requesting a non-existent politician returns 404"""
    response = client.get("/politicians/999")
    assert response.status_code == 404
    assert "detail" in response.json()


def test_politician_response_structure():
    """Test that politician response has all required fields"""
    response = client.get("/politicians/1")
    assert response.status_code == 200
    data = response.json()

    required_fields = [
        "id", "name", "image_url", "party",
        "state_or_district", "position",
        "vote_count", "statement_count"
    ]

    for field in required_fields:
        assert field in data, f"Missing required field: {field}"
