"""Tests for the search endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_search_by_name():
    """Test searching for politicians by name"""
    response = client.get("/search?name=Biden&zip_code=")
    assert response.status_code == 200
    data = response.json()
    assert "politician_summaries" in data
    assert len(data["politician_summaries"]) > 0
    assert "Biden" in data["politician_summaries"][0]["name"]


def test_search_case_insensitive():
    """Test that search is case insensitive"""
    response = client.get("/search?name=biden&zip_code=")
    assert response.status_code == 200
    data = response.json()
    assert len(data["politician_summaries"]) > 0


def test_search_partial_match():
    """Test that search works with partial names"""
    response = client.get("/search?name=Bid&zip_code=")
    assert response.status_code == 200
    data = response.json()
    assert len(data["politician_summaries"]) > 0


def test_search_no_results():
    """Test search with no matching results"""
    response = client.get("/search?name=NonexistentPolitician&zip_code=")
    assert response.status_code == 200
    data = response.json()
    assert data["politician_summaries"] == []


def test_search_without_zip_code():
    """Test that zip_code parameter is optional"""
    response = client.get("/search?name=Biden")
    assert response.status_code == 200
    data = response.json()
    assert len(data["politician_summaries"]) > 0
