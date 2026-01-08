#!/usr/bin/env python3
"""Test database connection and diagnose issues"""

import os
import sys
import socket
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
print(f"DATABASE_URL: {DATABASE_URL}\n")

# Parse the connection string
try:
    # Extract hostname
    parts = DATABASE_URL.split('@')
    if len(parts) < 2:
        print("❌ Invalid DATABASE_URL format")
        sys.exit(1)
    
    host_port = parts[1].split('/')[0]
    hostname = host_port.split(':')[0]
    port = host_port.split(':')[1] if ':' in host_port else '5432'
    
    print(f"Hostname: {hostname}")
    print(f"Port: {port}\n")
    
    # Test 1: DNS Resolution
    print("=" * 50)
    print("TEST 1: DNS Resolution")
    print("=" * 50)
    try:
        ip = socket.gethostbyname(hostname)
        print(f"✓ DNS resolved: {hostname} -> {ip}")
    except socket.gaierror as e:
        print(f"❌ DNS resolution failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your internet connection")
        print("  2. Verify the hostname is correct in Supabase")
        print("  3. Try clearing DNS cache (ipconfig /flushdns on Windows)")
        print("  4. Check if Supabase project is active (not paused)")
    
    # Test 2: Network connectivity (TCP)
    print("\n" + "=" * 50)
    print("TEST 2: Network Connectivity (TCP)")
    print("=" * 50)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((hostname, int(port)))
        sock.close()
        
        if result == 0:
            print(f"✓ TCP connection to {hostname}:{port} successful")
        else:
            print(f"❌ TCP connection to {hostname}:{port} failed")
            print("\nTroubleshooting:")
            print("  1. Check firewall settings")
            print("  2. Verify port 5432 is open")
            print("  3. Check Supabase project status")
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
    
    # Test 3: PostgreSQL connection
    print("\n" + "=" * 50)
    print("TEST 3: PostgreSQL Connection")
    print("=" * 50)
    try:
        import psycopg2
        conn = psycopg2.connect(DATABASE_URL)
        print("✓ PostgreSQL connection successful!")
        
        cur = conn.cursor()
        cur.execute("SELECT 1")
        print("✓ Query execution successful!")
        
        conn.close()
    except ImportError:
        print("⚠ psycopg2 not installed. Install with: pip install psycopg2-binary")
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Verify credentials in .env file")
        print("  2. Check if Supabase project is paused")
        print("  3. Verify the username/password are correct")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
