"""Tests for the policies endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_politician_policies():
    """Test retrieving policy positions for a politician"""
    response = client.get("/politicians/1/policies")
    assert response.status_code == 200
    data = response.json()
    assert "politician_id" in data
    assert "politician_name" in data
    assert "policies" in data
    assert isinstance(data["policies"], list)


def test_policy_structure():
    """Test that each policy has required fields"""
    response = client.get("/politicians/6/policies")
    assert response.status_code == 200
    data = response.json()

    if len(data["policies"]) > 0:
        policy = data["policies"][0]
        assert "category" in policy
        assert "stance" in policy
        assert "description" in policy
        assert "impact" in policy
