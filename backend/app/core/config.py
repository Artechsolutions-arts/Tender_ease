import os
import sys
from dotenv import load_dotenv

load_dotenv()

# ── Environment ───────────────────────────────────────────────────────────────
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION: bool = ENVIRONMENT == "production"

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/ap_eprocurement",
)

# ── JWT — fail hard if secrets are missing or still the insecure placeholder ──
_JWT_INSECURE_PLACEHOLDERS = {
    "", "changeme", "secret", "change_in_prod",
    "AP_eProcure_JWT_Secret_2024_Change_In_Prod",
    "AP_eProcure_Refresh_2024_Change_In_Prod",
}

JWT_SECRET: str = os.getenv("JWT_SECRET", "")
JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "")

if IS_PRODUCTION:
    if JWT_SECRET in _JWT_INSECURE_PLACEHOLDERS:
        sys.exit("FATAL: JWT_SECRET is not set or is an insecure placeholder. "
                 "Set a strong random value in your production .env file.")
    if JWT_REFRESH_SECRET in _JWT_INSECURE_PLACEHOLDERS:
        sys.exit("FATAL: JWT_REFRESH_SECRET is not set or is an insecure placeholder.")
    if len(JWT_SECRET) < 32:
        sys.exit("FATAL: JWT_SECRET must be at least 32 characters long.")
else:
    # Development fallback — log a warning so developers notice
    if not JWT_SECRET:
        JWT_SECRET = "dev-only-jwt-secret-do-not-use-in-production-32chars"
        print("WARNING: JWT_SECRET not set — using insecure development default.", file=sys.stderr)
    if not JWT_REFRESH_SECRET:
        JWT_REFRESH_SECRET = "dev-only-refresh-secret-do-not-use-in-production-32chars"

JWT_EXPIRES_MINUTES: int = int(os.getenv("JWT_EXPIRES_MINUTES", "15"))
JWT_REFRESH_EXPIRES_DAYS: int = int(os.getenv("JWT_REFRESH_EXPIRES_DAYS", "7"))

# ── Frontend / CORS ───────────────────────────────────────────────────────────
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ── Uploads — always use an absolute path ─────────────────────────────────────
UPLOADS_DIR: str = os.path.abspath(
    os.getenv("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
)
MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB

# ── AI / Ollama ───────────────────────────────────────────────────────────────
OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_VISION_MODEL: str = os.getenv("OLLAMA_VISION_MODEL", "moondream")

# ── SeaweedFS ─────────────────────────────────────────────────────────────────
SEAWEEDFS_MASTER_URL: str = os.getenv("SEAWEEDFS_MASTER_URL", "http://localhost:9333")
SEAWEEDFS_PUBLIC_URL: str = os.getenv("SEAWEEDFS_PUBLIC_URL", "http://localhost:8080")
SEAWEEDFS_ENABLED: bool = os.getenv("SEAWEEDFS_ENABLED", "false").lower() == "true"

# ── SMTP ─────────────────────────────────────────────────────────────────────
SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASS: str = os.getenv("SMTP_PASS", "")
SMTP_FROM: str = os.getenv("SMTP_FROM", "AP e-Procurement <noreply@apeprocurement.gov.in>")

# ── Procurement rules (GFR 2017) ──────────────────────────────────────────────
MIN_BIDS_FOR_EVALUATION: int = int(os.getenv("MIN_BIDS_FOR_EVALUATION", "3"))
