from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    database_url: str = "postgresql+psycopg://hotel:hotel@localhost:5432/hotel"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536
    admin_token: str = "change-me"          # simple shared token for the staff dashboard
    jwt_secret: str = "change-me-jwt-secret"  # sign per-property JWT tokens
    cors_origins: str = "*"                 # comma-separated; restrict in production
    history_turns: int = 20                 # past messages fed back to the agent
    max_tool_rounds: int = 8

    # ── Gemini Live (voice agent) ─────────────────────────────────────────────
    # Use GEMINI_API_KEY for Google AI Studio (easiest), OR set vertex_project_id
    # + GOOGLE_APPLICATION_CREDENTIALS for Vertex AI (needs roles/aiplatform.user).
    gemini_api_key: str = ""
    vertex_project_id: str = ""
    vertex_location: str = "us-central1"

    # ── Email (optional) ─────────────────────────────────────────────────────
    # Leave smtp_host empty to disable all email (safe default for dev/demo).
    smtp_host: str = ""
    smtp_port: int = 587           # 587 = STARTTLS, 465 = SSL
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_tls: bool = True          # STARTTLS on port 587; set False for plain SMTP
    email_from: str = ""           # sender address; falls back to smtp_user if empty
    email_from_name: str = "Hotel Concierge"
    staff_email: str = ""          # where new-booking alerts are sent
    email_enabled: bool = True


settings = Settings()
