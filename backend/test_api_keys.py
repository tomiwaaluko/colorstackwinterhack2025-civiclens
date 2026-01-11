"""
Script to test all API keys before populating the database
"""
import os
import asyncio
from dotenv import load_dotenv
import httpx
import google.generativeai as genai

# Load environment variables
load_dotenv()

async def test_congress_gov_api():
    """Test Congress.gov API key"""
    api_key = os.getenv("CONGRESS_GOV_API_KEY")
    if not api_key:
        return False, "CONGRESS_GOV_API_KEY not found in .env"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.congress.gov/v3/member",
                params={"api_key": api_key, "limit": 1},
                timeout=10.0
            )
            if response.status_code == 200:
                return True, "Congress.gov API key is valid"
            else:
                return False, f"Congress.gov API error: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"Congress.gov API error: {str(e)}"

async def test_openstates_api():
    """Test OpenStates API key"""
    api_key = os.getenv("OPENSTATES_API_KEY")
    if not api_key:
        return False, "OPENSTATES_API_KEY not found in .env"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://v3.openstates.org/people",
                headers={"X-API-Key": api_key},
                params={"jurisdiction": "California", "per_page": 1},
                timeout=10.0
            )
            if response.status_code == 200:
                return True, "OpenStates API key is valid"
            else:
                return False, f"OpenStates API error: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"OpenStates API error: {str(e)}"

async def test_google_civic_api():
    """Test Google Civic Information API key"""
    api_key = os.getenv("GOOGLE_CIVIC_API_KEY")
    if not api_key:
        return False, "GOOGLE_CIVIC_API_KEY not found in .env"

    try:
        async with httpx.AsyncClient() as client:
            # Test with a simple geocoding query instead
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "key": api_key,
                    "address": "1600 Amphitheatre Parkway, Mountain View, CA"
                },
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if "results" in data:
                    return True, "Google Civic API key is valid"
                else:
                    return False, f"Google Civic API error: {data.get('error_message', 'Unknown error')}"
            else:
                return False, f"Google Civic API error: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"Google Civic API error: {str(e)}"

def test_gemini_api():
    """Test Gemini API key"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return False, "GEMINI_API_KEY not found in .env"

    try:
        genai.configure(api_key=api_key)
        # Use the model specified in .env (gemini-2.5-flash)
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say hello in one word")
        if response and response.text:
            return True, f"Gemini API key is valid (using {model_name})"
        else:
            return False, "Gemini API returned empty response"
    except Exception as e:
        # Check if it's a quota error
        if "quota" in str(e).lower():
            return False, f"Gemini API quota exceeded - you may need to wait or upgrade your plan: {str(e)[:200]}"
        return False, f"Gemini API error: {str(e)[:200]}"

async def main():
    """Run all API tests"""
    print("=" * 70)
    print("Testing API Keys")
    print("=" * 70)

    all_passed = True

    # Test Congress.gov API
    print("\n[1/4] Testing Congress.gov API...")
    success, message = await test_congress_gov_api()
    print(f"  {'✓' if success else '✗'} {message}")
    all_passed = all_passed and success

    # Test OpenStates API
    print("\n[2/4] Testing OpenStates API...")
    success, message = await test_openstates_api()
    print(f"  {'✓' if success else '✗'} {message}")
    all_passed = all_passed and success

    # Test Google Civic API
    print("\n[3/4] Testing Google Civic Information API...")
    success, message = await test_google_civic_api()
    print(f"  {'✓' if success else '✗'} {message}")
    all_passed = all_passed and success

    # Test Gemini API (synchronous)
    print("\n[4/4] Testing Gemini API...")
    success, message = test_gemini_api()
    print(f"  {'✓' if success else '✗'} {message}")
    all_passed = all_passed and success

    print("\n" + "=" * 70)
    if all_passed:
        print("✓ All API keys are working correctly!")
        print("=" * 70)
        return 0
    else:
        print("✗ Some API keys failed. Please check the errors above.")
        print("=" * 70)
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
