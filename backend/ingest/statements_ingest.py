#!/usr/bin/env python3
"""
Statements Ingestion Script

Ingests curated official statements from politicians with reliable citations.
Supports multiple sources including official websites, press releases, and transcripts.

Requirements:
    pip install requests psycopg2-binary python-dotenv beautifulsoup4 html2text

Environment variables (.env):
    DATABASE_URL=postgresql://user:pass@localhost/dbname
"""

import os
import sys
import json
import logging
from datetime import datetime, date
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import re

import requests
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('statements_ingest.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False
    logger.warning("BeautifulSoup4 not installed. HTML parsing will be limited.")

try:
    import html2text
    HAS_HTML2TEXT = True
except ImportError:
    HAS_HTML2TEXT = False
    logger.warning("html2text not installed. HTML to text conversion will be limited.")

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")


@dataclass
class Statement:
    """Statement record"""
    politician_id: int
    text: str
    date: Optional[date]
    source_url: str
    publisher: str
    title: str


@dataclass
class Source:
    """Source record for provenance"""
    source_url: str
    publisher: str
    title: str
    source_type: str
    raw_text: str
    published_at: Optional[datetime] = None
    license_notes: Optional[str] = None


def extract_text_from_html(html_content: str) -> str:
    """Extract clean text from HTML content"""
    if HAS_HTML2TEXT:
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.ignore_images = True
        return h.handle(html_content).strip()
    elif HAS_BS4:
        soup = BeautifulSoup(html_content, 'html.parser')
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        return soup.get_text(separator=' ', strip=True)
    else:
        # Basic regex-based extraction as fallback
        # Remove script and style tags
        text = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text


def extract_date_from_text(text: str, url: str = None) -> Optional[date]:
    """Extract date from text or URL"""
    # Common date patterns
    date_patterns = [
        r'(\d{1,2})/(\d{1,2})/(\d{4})',  # MM/DD/YYYY
        r'(\d{4})-(\d{2})-(\d{2})',      # YYYY-MM-DD
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})',
    ]
    
    # Try text first
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                if len(match.groups()) == 3:
                    if pattern.startswith('(\d{4})'):
                        # YYYY-MM-DD
                        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
                    elif pattern.startswith('(\d{1,2})'):
                        # MM/DD/YYYY
                        return date(int(match.group(3)), int(match.group(1)), int(match.group(2)))
                    else:
                        # Month name format
                        month_names = {
                            'january': 1, 'february': 2, 'march': 3, 'april': 4,
                            'may': 5, 'june': 6, 'july': 7, 'august': 8,
                            'september': 9, 'october': 10, 'november': 11, 'december': 12
                        }
                        month = month_names.get(match.group(1).lower())
                        if month:
                            return date(int(match.group(3)), month, int(match.group(2)))
            except (ValueError, IndexError):
                continue
    
    # Try URL
    if url:
        url_match = re.search(r'/(\d{4})/(\d{2})/(\d{2})/', url)
        if url_match:
            try:
                return date(int(url_match.group(1)), int(url_match.group(2)), int(url_match.group(3)))
            except ValueError:
                pass
    
    return None


def fetch_statement_from_url(url: str, title: str = None) -> Dict[str, Any]:
    """Fetch and parse statement from URL"""
    try:
        response = requests.get(url, timeout=30, headers={
            'User-Agent': 'CivicLens/1.0 (Educational/Research)'
        })
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', '').lower()
        
        if 'html' in content_type:
            text = extract_text_from_html(response.text)
            extracted_date = extract_date_from_text(response.text, url)
        elif 'pdf' in content_type:
            # PDF handling would require pdfplumber or similar
            logger.warning(f"PDF content not yet supported: {url}")
            text = None
            extracted_date = None
        else:
            # Plain text
            text = response.text.strip()
            extracted_date = extract_date_from_text(text, url)
        
        return {
            'text': text,
            'date': extracted_date,
            'raw_html': response.text if 'html' in content_type else None,
            'title': title or extract_title_from_html(response.text) if 'html' in content_type else None
        }
    except Exception as e:
        logger.error(f"Failed to fetch {url}: {e}")
        raise


def extract_title_from_html(html_content: str) -> Optional[str]:
    """Extract title from HTML"""
    if HAS_BS4:
        soup = BeautifulSoup(html_content, 'html.parser')
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text().strip()
        h1_tag = soup.find('h1')
        if h1_tag:
            return h1_tag.get_text().strip()
    else:
        match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
        if match:
            return re.sub(r'<[^>]+>', '', match.group(1)).strip()
    return None


class DatabaseManager:
    """Database connection and operations manager"""
    
    def __init__(self, connection_string: str):
        try:
            # Convert asyncpg URL to psycopg2 format if needed
            if "+asyncpg" in connection_string:
                connection_string = connection_string.replace("+asyncpg", "")
            
            self.conn = psycopg2.connect(connection_string, connect_timeout=10)
            self.conn.autocommit = False
        except psycopg2.OperationalError as e:
            error_msg = str(e)
            if "could not translate host name" in error_msg.lower():
                logger.error(f"DNS resolution failed for database host. Error: {e}")
            raise
        
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
            logger.error("Transaction rolled back due to error")
        else:
            self.conn.commit()
            logger.info("Transaction committed")
        self.conn.close()
    
    def create_source(self, source: Source) -> int:
        """Insert a source record and return its ID"""
        with self.conn.cursor() as cur:
            # Check if source already exists
            cur.execute("""
                SELECT id FROM sources 
                WHERE source_url = %s
            """, (source.source_url,))
            existing = cur.fetchone()
            if existing:
                logger.debug(f"Source already exists: {source.source_url}")
                return existing[0]
            
            cur.execute("""
                INSERT INTO sources (source_url, publisher, title, source_type, published_at, 
                                   retrieved_at, license_notes, raw_text)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s)
                RETURNING id
            """, (
                source.source_url,
                source.publisher,
                source.title,
                source.source_type,
                source.published_at,
                source.license_notes,
                source.raw_text
            ))
            source_id = cur.fetchone()[0]
            logger.debug(f"Created source {source_id} for {source.title}")
            return source_id
    
    def find_politician_by_name(self, name: str) -> Optional[int]:
        """Find politician by name"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT id FROM politicians 
                WHERE name = %s
                LIMIT 1
            """, (name,))
            result = cur.fetchone()
            return result[0] if result else None
    
    def insert_statement(self, statement: Statement, source_id: int):
        """Insert statement record"""
        with self.conn.cursor() as cur:
            # Check if statement already exists
            cur.execute("""
                SELECT id FROM statements 
                WHERE politician_id = %s AND source_id = %s
            """, (statement.politician_id, source_id))
            
            if cur.fetchone():
                logger.debug(f"Statement already exists for politician {statement.politician_id}")
                return
            
            cur.execute("""
                INSERT INTO statements (politician_id, text, date, source_id)
                VALUES (%s, %s, %s, %s)
            """, (
                statement.politician_id,
                statement.text,
                statement.date,
                source_id
            ))
            logger.info(f"Created statement for politician {statement.politician_id}")


class StatementsIngestionPipeline:
    """Main ingestion orchestrator"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def ingest_from_url(self, url: str, politician_name: str, publisher: str = None, 
                       title: str = None, date: date = None):
        """Ingest statement from a URL"""
        logger.info(f"=== Ingesting statement from {url} ===")
        
        # Find politician
        politician_id = self.db.find_politician_by_name(politician_name)
        if not politician_id:
            logger.error(f"Politician not found: {politician_name}")
            raise ValueError(f"Politician not found: {politician_name}")
        
        # Fetch statement
        try:
            statement_data = fetch_statement_from_url(url, title)
            if not statement_data.get('text'):
                raise ValueError(f"No text extracted from {url}: {statement_data}")
            
            text = statement_data['text']
            extracted_date = statement_data.get('date') or date
            extracted_title = statement_data.get('title') or title or url
            
            # Convert date to datetime for published_at (Source.published_at expects Optional[datetime])
            published_at_datetime = None
            if extracted_date:
                # Combine date with time component (midnight UTC)
                from datetime import timezone
                published_at_datetime = datetime.combine(extracted_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            
            # Create source
            source = Source(
                source_url=url,
                publisher=publisher or "Official Website",
                title=extracted_title,
                source_type="statement",
                raw_text=statement_data.get('raw_html') or text,
                published_at=published_at_datetime
            )
            source_id = self.db.create_source(source)
            
            # Create statement
            statement = Statement(
                politician_id=politician_id,
                text=text,
                date=extracted_date,
                source_url=url,
                publisher=publisher or "Official Website",
                title=extracted_title
            )
            self.db.insert_statement(statement, source_id)
            
            logger.info(f"Successfully ingested statement from {url}")
            
        except Exception as e:
            logger.error(f"Failed to ingest statement from {url}: {e}")
            raise
    
    def ingest_from_json_file(self, json_file: str):
        """Ingest statements from a JSON file (curated list)"""
        logger.info(f"=== Ingesting statements from {json_file} ===")
        
        with open(json_file, 'r', encoding='utf-8') as f:
            statements_list = json.load(f)
        
        for stmt in statements_list:
            try:
                politician_name = stmt['politician_name']
                url = stmt['url']
                publisher = stmt.get('publisher', 'Official Website')
                title = stmt.get('title')
                date_str = stmt.get('date')
                
                date_obj = None
                if date_str:
                    try:
                        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                    except ValueError:
                        pass
                
                self.ingest_from_url(url, politician_name, publisher, title, date_obj)
                
            except Exception as e:
                logger.error(f"Failed to ingest statement: {e}")
                continue
        
        logger.info(f"=== Completed ingestion from {json_file} ===")
    
    def ingest_manual(self, politician_name: str, text: str, url: str, 
                     publisher: str = None, title: str = None, date: date = None):
        """Manually ingest a statement (text provided directly)"""
        logger.info(f"=== Manually ingesting statement for {politician_name} ===")
        
        # Find politician
        politician_id = self.db.find_politician_by_name(politician_name)
        if not politician_id:
            logger.error(f"Politician not found: {politician_name}")
            raise ValueError(f"Politician not found: {politician_name}")
        
        # Create source
        source = Source(
            source_url=url,
            publisher=publisher or "Manual Entry",
            title=title or url,
            source_type="statement",
            raw_text=text,
            published_at=date
        )
        source_id = self.db.create_source(source)
        
        # Create statement
        statement = Statement(
            politician_id=politician_id,
            text=text,
            date=date,
            source_url=url,
            publisher=publisher or "Manual Entry",
            title=title or url
        )
        self.db.insert_statement(statement, source_id)
        
        logger.info(f"Successfully ingested manual statement for {politician_name}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Statements Ingestion')
    parser.add_argument('--url', type=str, help='URL to fetch statement from')
    parser.add_argument('--politician', type=str, help='Politician name')
    parser.add_argument('--publisher', type=str, help='Publisher name')
    parser.add_argument('--title', type=str, help='Statement title')
    parser.add_argument('--date', type=str, help='Statement date (YYYY-MM-DD)')
    parser.add_argument('--json-file', type=str, help='JSON file with curated statements')
    parser.add_argument('--text', type=str, help='Statement text (for manual entry)')
    
    args = parser.parse_args()
    
    logger.info("=== Statements Ingestion Pipeline Started ===")
    
    with DatabaseManager(DATABASE_URL) as db:
        pipeline = StatementsIngestionPipeline(db)
        
        try:
            if args.json_file:
                # Ingest from JSON file
                pipeline.ingest_from_json_file(args.json_file)
            elif args.text and args.url and args.politician:
                # Manual entry (more specific check first)
                date_obj = None
                if args.date:
                    try:
                        date_obj = datetime.strptime(args.date, '%Y-%m-%d').date()
                    except ValueError:
                        logger.error(f"Invalid date format: {args.date}. Use YYYY-MM-DD")
                
                pipeline.ingest_manual(
                    args.politician,
                    args.text,
                    args.url,
                    args.publisher,
                    args.title,
                    date_obj
                )
            elif args.url and args.politician:
                # Ingest from URL
                date_obj = None
                if args.date:
                    try:
                        date_obj = datetime.strptime(args.date, '%Y-%m-%d').date()
                    except ValueError:
                        logger.error(f"Invalid date format: {args.date}. Use YYYY-MM-DD")
                
                pipeline.ingest_from_url(
                    args.url, 
                    args.politician, 
                    args.publisher, 
                    args.title, 
                    date_obj
                )
            else:
                logger.error("Must provide either --json-file, or --url + --politician, or --text + --url + --politician")
                logger.error("Example: python statements_ingest.py --url https://... --politician 'Joe Biden'")
                sys.exit(1)
                    
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise
    
    logger.info("=== Statements Ingestion Pipeline Complete ===")


if __name__ == "__main__":
    main()

