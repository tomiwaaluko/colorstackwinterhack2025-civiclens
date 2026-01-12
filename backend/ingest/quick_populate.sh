#!/bin/bash
#
# Quick Data Population Script
#
# This script guides you through populating your database with votes, bills, and statements.
# It checks for required API keys and provides helpful guidance.
#

set -e  # Exit on error

echo "=============================================================================="
echo "  CIVIC LENS - QUICK DATA POPULATION"
echo "=============================================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "populate_politician_data.py" ]; then
    echo "❌ Error: Please run this script from the backend/ingest directory"
    exit 1
fi

# Check for .env file
if [ ! -f "../../.env" ] && [ ! -f "../.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Create a .env file with your API keys:"
    echo "   DATABASE_URL=postgresql://..."
    echo "   CONGRESS_GOV_API_KEY=your_key_here (get FREE at https://api.congress.gov/sign-up/)"
    echo "   FEC_API_KEY=your_key_here"
    echo ""
    read -p "Do you want to continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Menu
echo "What would you like to do?"
echo ""
echo "1) Check current database status"
echo "2) Populate EVERYTHING (votes, bills, statements)"
echo "3) Populate ONLY votes and bills"
echo "4) Populate ONLY sample statements"
echo "5) Analyze donations linkage"
echo "6) Quick populate (50 votes per chamber)"
echo "0) Exit"
echo ""
read -p "Enter your choice [0-6]: " choice

case $choice in
    1)
        echo ""
        echo "📊 Checking database status..."
        python3 populate_politician_data.py --check-only
        ;;
    2)
        echo ""
        echo "⚠️  This will fetch up to 100 bills (with associated votes)."
        echo "   This may take 10-20 minutes depending on your API key limits."
        read -p "Continue? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo "🚀 Populating all data..."
            python3 populate_politician_data.py --populate-all --max-bills 100
        fi
        ;;
    3)
        echo ""
        read -p "How many bills? (default: 100): " bills
        bills=${bills:-100}
        echo ""
        echo "🚀 Populating votes and bills..."
        python3 populate_politician_data.py --votes-only --max-bills $bills
        ;;
    4)
        echo ""
        echo "🚀 Adding sample statements..."
        python3 populate_politician_data.py --statements-only
        ;;
    5)
        echo ""
        echo "🔍 Analyzing donations and sources..."
        python3 analyze_donations_sources.py --analyze --suggest
        ;;
    6)
        echo ""
        echo "🚀 Quick populate (100 bills + sample statements)..."
        python3 populate_politician_data.py --populate-all --max-bills 100
        ;;
    0)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=============================================================================="
echo "✅ DONE!"
echo "=============================================================================="
echo ""
echo "📝 Next steps:"
echo "   • Check the logs: populate_politician_data.log"
echo "   • Run again with option 1 to see updated status"
echo "   • Get Congress.gov API key: https://api.congress.gov/sign-up/"
echo "   • Read README_DATA_POPULATION.md for advanced usage"
echo ""
