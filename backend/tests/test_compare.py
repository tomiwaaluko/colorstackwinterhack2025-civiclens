"""Tests for the compare endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_compare_two_politicians():
    """Test comparing two politicians"""
    response = client.get("/compare?ids=1,2")
    assert response.status_code == 200
    data = response.json()
    assert "politician_summaries" in data
    assert len(data["politician_summaries"]) == 2


def test_compare_multiple_politicians():
    """Test comparing more than two politicians"""
    response = client.get("/compare?ids=1,2,3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["politician_summaries"]) == 3


def test_compare_single_politician():
    """Test compare with just one ID"""
    response = client.get("/compare?ids=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["politician_summaries"]) == 1


def test_compare_nonexistent_politician():
    """Test that comparing with a non-existent ID returns 404"""
    response = client.get("/compare?ids=1,999")
    assert response.status_code == 404
    assert "detail" in response.json()


def test_compare_response_structure():
    """Test that compare response has correct structure"""
    response = client.get("/compare?ids=1,2")
    assert response.status_code == 200
    data = response.json()

    # Check each politician has required fields
    for politician in data["politician_summaries"]:
        assert "id" in politician
        assert "name" in politician
        assert "party" in politician
        assert "position" in politician


def test_compare_with_spaces():
    """Test that IDs with spaces are handled correctly"""
    response = client.get("/compare?ids=1, 2, 3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["politician_summaries"]) == 3
