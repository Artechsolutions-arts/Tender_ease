"""
Production hardening migration — run once on existing databases.

Adds:
  - Soft-delete columns to tenders (is_deleted, deleted_at, deleted_by)
  - DB-level CHECK constraints (tender dates, bid amount)
  - New compliance tables: emd_submissions, tender_addenda, tec_members, bid_technical_scores
  - ai_extracted_fields / ai_detected_type on document_validations (if not already added)

Run with:
    cd backend
    python migrate_production_hardening.py
"""
import sys
from sqlalchemy import text
from app.database import engine, create_tables


def run():
    print("Running production hardening migration...")

    with engine.connect() as conn:
        # 1. Soft-delete columns on tenders
        _add_col(conn, "tenders", "is_deleted", "BOOLEAN NOT NULL DEFAULT FALSE")
        _add_col(conn, "tenders", "deleted_at",  "TIMESTAMPTZ")
        _add_col(conn, "tenders", "deleted_by",  "VARCHAR")

        # 2. CHECK constraints — IF NOT EXISTS not supported for constraints; use DO block
        _add_check(conn, "tenders", "ck_tender_value_positive", "estimated_value > 0")
        _add_check(conn, "tenders", "ck_tender_dates_valid",    "end_date > start_date")
        _add_check(conn, "bids",    "ck_bid_amount_positive",   "amount > 0")

        # 3. document_validations extra columns (may already exist from previous migration)
        _add_col(conn, "document_validations", "ai_extracted_fields", "JSON")
        _add_col(conn, "document_validations", "ai_detected_type",    "VARCHAR")

        conn.commit()

    # 4. Create new compliance tables via SQLAlchemy create_all (only creates missing tables)
    create_tables()
    print("\nMigration complete. New tables created: emd_submissions, tender_addenda, tec_members, bid_technical_scores")


def _add_col(conn, table: str, column: str, ddl: str):
    try:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {ddl}"))
        print(f"  ✓ {table}.{column}")
    except Exception as e:
        print(f"  WARN: {table}.{column} — {e}")


def _add_check(conn, table: str, name: str, expr: str):
    try:
        conn.execute(text(f"""
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = '{name}'
              ) THEN
                ALTER TABLE {table} ADD CONSTRAINT {name} CHECK ({expr});
              END IF;
            END
            $$;
        """))
        print(f"  ✓ CHECK {name}")
    except Exception as e:
        print(f"  WARN: CHECK {name} — {e}")


if __name__ == "__main__":
    run()
