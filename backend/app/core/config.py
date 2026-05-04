import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ap_eprocurement")
JWT_SECRET: str = os.getenv("JWT_SECRET", "AP_eProcure_JWT_Secret_2024_Change_In_Prod")
JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "AP_eProcure_Refresh_2024_Change_In_Prod")
JWT_EXPIRES_MINUTES: int = 15
JWT_REFRESH_EXPIRES_DAYS: int = 7
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:8080")
OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_VISION_MODEL: str = os.getenv("OLLAMA_VISION_MODEL", "moondream")
UPLOADS_DIR: str = os.getenv("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASS: str = os.getenv("SMTP_PASS", "")
SMTP_FROM: str = os.getenv("SMTP_FROM", "AP e-Procurement <noreply@apeprocurement.gov.in>")
