"""Tests for the health endpoint"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    """Test that health endpoint returns ok status"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
