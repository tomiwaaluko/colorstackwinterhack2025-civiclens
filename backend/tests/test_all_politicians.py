"""Tests for get all politicians endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_all_politicians():
    """Test retrieving all politicians"""
    response = client.get("/politicians")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_all_politicians_have_required_fields():
    """Test that all politicians have basic required fields"""
    response = client.get("/politicians")
    assert response.status_code == 200
    politicians = response.json()

    for politician in politicians:
        assert "id" in politician
        assert "name" in politician
        assert "party" in politician
        assert "position" in politician
