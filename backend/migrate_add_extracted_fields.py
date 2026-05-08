"""One-shot migration: add ai_extracted_fields and ai_detected_type to document_validations."""
import sys
from sqlalchemy import text
from app.database import engine


def run():
    with engine.connect() as conn:
        for col, ddl in [
            ("ai_extracted_fields", "ALTER TABLE document_validations ADD COLUMN IF NOT EXISTS ai_extracted_fields JSON"),
            ("ai_detected_type",    "ALTER TABLE document_validations ADD COLUMN IF NOT EXISTS ai_detected_type VARCHAR"),
        ]:
            conn.execute(text(ddl))
            print(f"  ✓ {col}")
        conn.commit()
    print("Migration complete.")


if __name__ == "__main__":
    run()
