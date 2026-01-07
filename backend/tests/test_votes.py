"""Tests for the votes endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_politician_votes():
    """Test retrieving voting record for a politician"""
    response = client.get("/politicians/1/votes")
    assert response.status_code == 200
    data = response.json()
    assert "politician_id" in data
    assert "politician_name" in data
    assert "votes" in data
    assert isinstance(data["votes"], list)


def test_votes_structure():
    """Test that each vote has required fields"""
    response = client.get("/politicians/1/votes")
    assert response.status_code == 200
    data = response.json()

    if len(data["votes"]) > 0:
        vote = data["votes"][0]
        assert "bill_name" in vote
        assert "vote" in vote
        assert "date" in vote
        assert "description" in vote


def test_get_votes_politician_not_found():
    """Test that requesting votes for non-existent politician returns 404"""
    response = client.get("/politicians/999/votes")
    assert response.status_code == 404
