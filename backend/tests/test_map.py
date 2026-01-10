"""Tests for the map endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_politicians_by_state():
    """Test retrieving politicians by state"""
    response = client.get("/map/politicians?state=CA")
    assert response.status_code == 200
    data = response.json()
    assert "politicians" in data
    assert isinstance(data["politicians"], list)


def test_map_politician_structure():
    """Test that each map politician has required fields"""
    response = client.get("/map/politicians?state=NY")
    assert response.status_code == 200
    data = response.json()

    if len(data["politicians"]) > 0:
        politician = data["politicians"][0]
        assert "id" in politician
        assert "name" in politician
        assert "party" in politician
        assert "position" in politician
        assert "location" in politician
        assert "center" in politician["location"]


def test_get_national_politicians():
    """Test retrieving national-level politicians"""
    response = client.get("/map/national")
    assert response.status_code == 200
    data = response.json()
    assert "politicians" in data

    # Should include Biden and Harris
    assert len(data["politicians"]) >= 2


def test_national_politicians_are_flagged():
    """Test that national politicians have correct location type"""
    response = client.get("/map/national")
    assert response.status_code == 200
    data = response.json()

    for politician in data["politicians"]:
        assert politician["location"]["type"] == "national"
