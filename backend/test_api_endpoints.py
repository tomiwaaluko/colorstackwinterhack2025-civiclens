"""
Integration tests for API endpoints with Supabase database.

Run with: pytest test_api_endpoints.py -v
Or: python test_api_endpoints.py
"""

import asyncio
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test the health check endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Health check: {data}")


@pytest.mark.asyncio
async def test_get_all_politicians():
    """Test fetching all politicians from Supabase"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/politicians")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        if len(data) > 0:
            print(f"✓ Retrieved {len(data)} politicians from database")
            # Check first politician structure
            first = data[0]
            assert "id" in first
            assert "name" in first
            assert "party" in first
            print(f"  Sample: {first.get('name')} ({first.get('party')})")
        else:
            print("⚠ No politicians found in database")


@pytest.mark.asyncio
async def test_get_politician_by_id():
    """Test fetching a single politician by ID"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First get all politicians to get a valid ID
        all_response = await client.get("/politicians")
        assert all_response.status_code == 200
        politicians = all_response.json()

        if len(politicians) == 0:
            print("⚠ Skipping test - no politicians in database")
            pytest.skip("No politicians in database")

        # Get the first politician's ID
        test_id = politicians[0]["id"]
        test_name = politicians[0]["name"]

        # Test fetching by ID
        response = await client.get(f"/politicians/{test_id}")
        assert response.status_code == 200

        politician = response.json()
        assert politician["id"] == test_id
        assert politician["name"] == test_name
        assert "politician_details" in politician
        assert "party" in politician
        assert "state_or_district" in politician

        print(f"✓ Successfully retrieved politician by ID: {test_name}")
        print(f"  ID: {test_id}")
        print(f"  Vote count: {politician.get('vote_count', 0)}")
        print(f"  Statement count: {politician.get('statement_count', 0)}")


@pytest.mark.asyncio
async def test_get_nonexistent_politician():
    """Test fetching a politician with invalid ID"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Use a random UUID that likely doesn't exist
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/politicians/{fake_id}")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print(f"✓ Correctly returned 404 for non-existent politician")


@pytest.mark.asyncio
async def test_politician_has_votes():
    """Test that politicians have associated vote data"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        all_response = await client.get("/politicians")
        politicians = all_response.json()

        if len(politicians) == 0:
            pytest.skip("No politicians in database")

        # Find a politician with votes
        politician_with_votes = None
        for pol in politicians:
            if pol.get("vote_count", 0) > 0:
                politician_with_votes = pol
                break

        if politician_with_votes:
            response = await client.get(f"/politicians/{politician_with_votes['id']}")
            politician = response.json()

            votes = politician["politician_details"]["votes"]
            assert len(votes) > 0
            print(f"✓ Politician {politician['name']} has {len(votes)} votes")
            print(f"  Sample vote: {votes[0]}")
        else:
            print("⚠ No politicians with votes found in database")


@pytest.mark.asyncio
async def test_politician_has_statements():
    """Test that politicians have associated statement data"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        all_response = await client.get("/politicians")
        politicians = all_response.json()

        if len(politicians) == 0:
            pytest.skip("No politicians in database")

        # Find a politician with statements
        politician_with_statements = None
        for pol in politicians:
            if pol.get("statement_count", 0) > 0:
                politician_with_statements = pol
                break

        if politician_with_statements:
            response = await client.get(f"/politicians/{politician_with_statements['id']}")
            politician = response.json()

            statements = politician["politician_details"]["statements"]
            assert len(statements) > 0
            print(f"✓ Politician {politician['name']} has {len(statements)} statements")
            print(f"  Sample statement: {statements[0][:80]}...")
        else:
            print("⚠ No politicians with statements found in database")


async def run_all_tests():
    """Run all tests manually without pytest"""
    print("=" * 70)
    print("API ENDPOINT TESTS WITH SUPABASE")
    print("=" * 70)

    tests = [
        ("Health Endpoint", test_health_endpoint),
        ("Get All Politicians", test_get_all_politicians),
        ("Get Politician by ID", test_get_politician_by_id),
        ("Get Non-existent Politician", test_get_nonexistent_politician),
        ("Politician Has Votes", test_politician_has_votes),
        ("Politician Has Statements", test_politician_has_statements),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        print(f"\n[TEST] {test_name}")
        print("-" * 70)
        try:
            await test_func()
            passed += 1
            print(f"✓ PASSED")
        except AssertionError as e:
            failed += 1
            print(f"✗ FAILED: {e}")
        except Exception as e:
            failed += 1
            print(f"✗ ERROR: {e}")

    print("\n" + "=" * 70)
    print(f"TEST RESULTS: {passed} passed, {failed} failed")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
