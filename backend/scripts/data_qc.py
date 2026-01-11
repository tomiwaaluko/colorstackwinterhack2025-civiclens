#!/usr/bin/env python3
"""
Data Quality Control Automation Script

Performs automated QC checks on database data to ensure quality and integrity.

QC Checks:
- Missing/invalid URLs
- Empty raw_text
- Orphaned chunks/embeddings
- Duplicate sources
- Outdated retrieved_at (flag only)
- Missing required fields
- Invalid foreign key references

Requirements:
    pip install psycopg2-binary python-dotenv

Environment variables (.env):
    DATABASE_URL=postgresql://user:pass@localhost/dbname
"""

import os
import sys
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from dataclasses import dataclass
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('data_qc.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")

# QC Configuration
OUTDATED_THRESHOLD_DAYS = 90  # Flag sources older than this


@dataclass
class QCIssue:
    """Represents a QC issue"""
    check_name: str
    severity: str  # 'error', 'warning', 'info'
    table: str
    record_id: Optional[int]
    description: str
    fixable: bool = False
    fix_sql: Optional[str] = None
    fix_params: Optional[tuple] = None


class DatabaseManager:
    """Database connection manager"""
    
    def __init__(self, connection_string: str):
        try:
            if "+asyncpg" in connection_string:
                connection_string = connection_string.replace("+asyncpg", "")
            
            self.conn = psycopg2.connect(connection_string, connect_timeout=10)
            self.conn.autocommit = False
        except psycopg2.OperationalError as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
        
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.conn.close()
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """Execute query and return results"""
        with self.conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


class QCChecker:
    """Quality control checker"""
    
    def __init__(self, db: DatabaseManager):
        self.db = db
        self.issues: List[QCIssue] = []
    
    def check_missing_urls(self):
        """Check for missing or invalid source URLs"""
        logger.info("Checking for missing/invalid URLs...")
        
        results = self.db.execute_query("""
            SELECT id, source_url, title, source_type
            FROM sources
            WHERE source_url IS NULL OR source_url = '' OR source_url NOT LIKE 'http%'
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="missing_invalid_url",
                severity="error",
                table="sources",
                record_id=row['id'],
                description=f"Invalid or missing URL: {row['source_url']}",
                fixable=False
            ))
        
        logger.info(f"Found {len(results)} sources with missing/invalid URLs")
    
    def check_empty_raw_text(self):
        """Check for sources with empty raw_text"""
        logger.info("Checking for empty raw_text...")
        
        results = self.db.execute_query("""
            SELECT id, source_url, title, source_type
            FROM sources
            WHERE raw_text IS NULL OR raw_text = '' OR LENGTH(TRIM(raw_text)) < 50
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="empty_raw_text",
                severity="warning",
                table="sources",
                record_id=row['id'],
                description=f"Source has empty or very short raw_text",
                fixable=False
            ))
        
        logger.info(f"Found {len(results)} sources with empty raw_text")
    
    def check_orphaned_chunks(self):
        """Check for chunks without sources"""
        logger.info("Checking for orphaned chunks...")
        
        results = self.db.execute_query("""
            SELECT sc.id, sc.source_id
            FROM source_chunks sc
            LEFT JOIN sources s ON sc.source_id = s.id
            WHERE s.id IS NULL
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="orphaned_chunk",
                severity="error",
                table="source_chunks",
                record_id=row['id'],
                description=f"Chunk references non-existent source_id: {row['source_id']}",
                fixable=True,
                fix_sql="DELETE FROM source_chunks WHERE id = %s",
                fix_params=(row['id'],)
            ))
        
        logger.info(f"Found {len(results)} orphaned chunks")
    
    def check_orphaned_embeddings(self):
        """Check for embeddings without chunks"""
        logger.info("Checking for orphaned embeddings...")
        
        results = self.db.execute_query("""
            SELECT e.id, e.chunk_id
            FROM embeddings e
            LEFT JOIN source_chunks sc ON e.chunk_id = sc.id
            WHERE sc.id IS NULL
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="orphaned_embedding",
                severity="error",
                table="embeddings",
                record_id=row['id'],
                description=f"Embedding references non-existent chunk_id: {row['chunk_id']}",
                fixable=True,
                fix_sql="DELETE FROM embeddings WHERE id = %s",
                fix_params=(row['id'],)
            ))
        
        logger.info(f"Found {len(results)} orphaned embeddings")
    
    def check_duplicate_sources(self):
        """Check for duplicate source URLs"""
        logger.info("Checking for duplicate sources...")
        
        results = self.db.execute_query("""
            SELECT source_url, COUNT(*) as count, ARRAY_AGG(id) as ids
            FROM sources
            WHERE source_url IS NOT NULL AND source_url != ''
            GROUP BY source_url
            HAVING COUNT(*) > 1
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="duplicate_source",
                severity="warning",
                table="sources",
                record_id=None,
                description=f"Duplicate source URL found {row['count']} times: {row['source_url']}",
                fixable=False
            ))
        
        logger.info(f"Found {len(results)} duplicate source URLs")
    
    def check_outdated_sources(self):
        """Flag sources with outdated retrieved_at"""
        logger.info("Checking for outdated sources...")
        
        # Use timezone-aware datetime for consistency
        now = datetime.now(timezone.utc)
        threshold_date = now - timedelta(days=OUTDATED_THRESHOLD_DAYS)
        
        results = self.db.execute_query("""
            SELECT id, source_url, retrieved_at
            FROM sources
            WHERE retrieved_at < %s
        """, (threshold_date,))
        
        for row in results:
            # Ensure retrieved_at is timezone-aware for comparison
            retrieved_at = row['retrieved_at']
            if retrieved_at.tzinfo is None:
                # Assume UTC if naive
                retrieved_at = retrieved_at.replace(tzinfo=timezone.utc)
            days_old = (now - retrieved_at).days
            self.issues.append(QCIssue(
                check_name="outdated_source",
                severity="info",
                table="sources",
                record_id=row['id'],
                description=f"Source retrieved {days_old} days ago (flagged as outdated)",
                fixable=False
            ))
        
        logger.info(f"Found {len(results)} outdated sources")
    
    def check_missing_required_fields(self):
        """Check for missing required fields"""
        logger.info("Checking for missing required fields...")
        
        # Check sources
        results = self.db.execute_query("""
            SELECT id, source_url, title, publisher, source_type
            FROM sources
            WHERE title IS NULL OR title = '' 
               OR publisher IS NULL OR publisher = ''
               OR source_type IS NULL OR source_type = ''
        """)
        
        for row in results:
            missing = []
            if not row['title']:
                missing.append("title")
            if not row['publisher']:
                missing.append("publisher")
            if not row['source_type']:
                missing.append("source_type")
            
            self.issues.append(QCIssue(
                check_name="missing_required_field",
                severity="error",
                table="sources",
                record_id=row['id'],
                description=f"Missing required fields: {', '.join(missing)}",
                fixable=False
            ))
        
        logger.info(f"Found {len(results)} sources with missing required fields")
    
    def check_invalid_foreign_keys(self):
        """Check for invalid foreign key references"""
        logger.info("Checking for invalid foreign key references...")
        
        # Check votes -> politicians
        results = self.db.execute_query("""
            SELECT v.id, v.politician_id
            FROM votes v
            LEFT JOIN politicians p ON v.politician_id = p.id
            WHERE p.id IS NULL
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="invalid_foreign_key",
                severity="error",
                table="votes",
                record_id=row['id'],
                description=f"Vote references non-existent politician_id: {row['politician_id']}",
                fixable=False
            ))
        
        # Check votes -> bills
        results = self.db.execute_query("""
            SELECT v.id, v.bill_id
            FROM votes v
            LEFT JOIN bills b ON v.bill_id = b.id
            WHERE b.id IS NULL
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="invalid_foreign_key",
                severity="error",
                table="votes",
                record_id=row['id'],
                description=f"Vote references non-existent bill_id: {row['bill_id']}",
                fixable=False
            ))
        
        # Check donations -> politicians
        results = self.db.execute_query("""
            SELECT d.id, d.politician_id
            FROM donations d
            LEFT JOIN politicians p ON d.politician_id = p.id
            WHERE p.id IS NULL
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="invalid_foreign_key",
                severity="error",
                table="donations",
                record_id=row['id'],
                description=f"Donation references non-existent politician_id: {row['politician_id']}",
                fixable=False
            ))
        
        # Check statements -> politicians
        results = self.db.execute_query("""
            SELECT s.id, s.politician_id
            FROM statements s
            LEFT JOIN politicians p ON s.politician_id = p.id
            WHERE p.id IS NULL
        """)
        
        for row in results:
            self.issues.append(QCIssue(
                check_name="invalid_foreign_key",
                severity="error",
                table="statements",
                record_id=row['id'],
                description=f"Statement references non-existent politician_id: {row['politician_id']}",
                fixable=False
            ))
        
        logger.info("Completed foreign key checks")
    
    def run_all_checks(self):
        """Run all QC checks"""
        logger.info("=" * 60)
        logger.info("Starting QC checks...")
        logger.info("=" * 60)
        
        self.check_missing_urls()
        self.check_empty_raw_text()
        self.check_orphaned_chunks()
        self.check_orphaned_embeddings()
        self.check_duplicate_sources()
        self.check_outdated_sources()
        self.check_missing_required_fields()
        self.check_invalid_foreign_keys()
        
        logger.info("=" * 60)
        logger.info("QC checks complete")
        logger.info("=" * 60)
    
    def print_summary(self):
        """Print summary of issues found"""
        errors = [i for i in self.issues if i.severity == 'error']
        warnings = [i for i in self.issues if i.severity == 'warning']
        infos = [i for i in self.issues if i.severity == 'info']
        
        print("\n" + "=" * 60)
        print("QC Summary")
        print("=" * 60)
        print(f"Total Issues: {len(self.issues)}")
        print(f"  Errors: {len(errors)}")
        print(f"  Warnings: {len(warnings)}")
        print(f"  Info: {len(infos)}")
        print("=" * 60)
        
        if errors:
            print("\nErrors:")
            for issue in errors[:10]:  # Show first 10
                print(f"  - [{issue.table}] ID {issue.record_id}: {issue.description}")
            if len(errors) > 10:
                print(f"  ... and {len(errors) - 10} more errors")
        
        if warnings:
            print("\nWarnings:")
            for issue in warnings[:10]:
                print(f"  - [{issue.table}] ID {issue.record_id}: {issue.description}")
            if len(warnings) > 10:
                print(f"  ... and {len(warnings) - 10} more warnings")
    
    def export_to_json(self, filename: str = "qc_report.json"):
        """Export issues to JSON file"""
        import json
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_issues': len(self.issues),
            'issues': [
                {
                    'check_name': i.check_name,
                    'severity': i.severity,
                    'table': i.table,
                    'record_id': i.record_id,
                    'description': i.description,
                    'fixable': i.fixable,
                    'fix_sql': i.fix_sql
                }
                for i in self.issues
            ]
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Exported QC report to {filename}")
    
    def apply_fixes(self, dry_run: bool = True):
        """Apply fixable fixes"""
        fixable_issues = [i for i in self.issues if i.fixable and i.fix_sql]
        
        if not fixable_issues:
            logger.info("No fixable issues found")
            return
        
        logger.info(f"Found {len(fixable_issues)} fixable issues")
        
        if dry_run:
            logger.info("DRY RUN - Would execute:")
            for issue in fixable_issues:
                logger.info(f"  {issue.fix_sql}")
        else:
            # Begin transaction
            try:
                with self.db.conn.cursor() as cur:
                    for issue in fixable_issues:
                        try:
                            # Use parameterized SQL for safety
                            if issue.fix_params:
                                cur.execute(issue.fix_sql, issue.fix_params)
                            else:
                                cur.execute(issue.fix_sql)
                            logger.info(f"Fixed issue: {issue.description}")
                        except Exception as e:
                            logger.error(f"Failed to fix issue {issue.check_name} (ID: {issue.record_id}): {e}")
                            raise
                    # Commit only after all fixes succeed
                    self.db.conn.commit()
                    logger.info(f"Successfully applied {len(fixable_issues)} fixes")
            except psycopg2.DatabaseError as db_err:
                # Rollback on database error
                self.db.conn.rollback()
                logger.error(f"Database error during fix application. Transaction rolled back: {db_err}")
                raise
            except Exception as e:
                # Rollback on any other error
                self.db.conn.rollback()
                logger.error(f"Error during fix application. Transaction rolled back: {e}")
                raise


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Data Quality Control')
    parser.add_argument('--export', type=str, help='Export report to JSON file')
    parser.add_argument('--fix', action='store_true', help='Apply fixable fixes')
    parser.add_argument('--dry-run', action='store_true', default=True, 
                       help='Dry run mode (default: True). Use --no-dry-run to apply fixes.')
    parser.add_argument('--no-dry-run', dest='dry_run', action='store_false',
                       help='Apply fixes (disable dry run mode)')
    
    args = parser.parse_args()
    
    with DatabaseManager(DATABASE_URL) as db:
        checker = QCChecker(db)
        
        try:
            checker.run_all_checks()
            checker.print_summary()
            
            if args.export:
                checker.export_to_json(args.export)
            
            if args.fix:
                checker.apply_fixes(dry_run=args.dry_run)
                if not args.dry_run:
                    db.conn.commit()
                    logger.info("Fixes applied and committed")
        
        except Exception as e:
            logger.error(f"QC check failed: {e}", exc_info=True)
            raise


if __name__ == "__main__":
    main()

