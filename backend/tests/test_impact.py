"""Tests for the impact endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_politician_impact():
    """Test retrieving impact data for a politician"""
    response = client.get("/politicians/1/impact")
    assert response.status_code == 200
    data = response.json()
    assert "politician_id" in data
    assert "politician_name" in data
    assert "current_bills" in data
    assert "summary" in data


def test_current_bill_structure():
    """Test that each bill has required fields"""
    response = client.get("/politicians/1/impact")
    assert response.status_code == 200
    data = response.json()

    if len(data["current_bills"]) > 0:
        bill = data["current_bills"][0]
        assert "title" in bill
        assert "status" in bill
        assert "your_impact" in bill
