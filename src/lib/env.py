"""
Centralized environment configuration service.
Loads all environment variables once and provides typed access.
"""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

# Load environment variables once at module import
load_dotenv()


def _get_required(key: str) -> str:
    """Get required environment variable or raise error."""
    value = os.environ.get(key)
    if value is None:
        raise EnvironmentError(f"Required environment variable '{key}' is not set")  # noqa: UP024
    return value


def _get_optional(key: str, default: str = "") -> str:
    """Get optional environment variable with default."""
    return os.getenv(key, default)


def _get_int(key: str, default: int) -> int:
    """Get integer environment variable with default."""
    return int(os.getenv(key, str(default)))


@dataclass(frozen=True)
class FilesystemConfig:
    """Filesystem paths configuration."""

    cache_dir_json: str
    cache_dir_flat: str
    cache_dir_summaries: str
    cache_dir_prompts: str


@dataclass(frozen=True)
class QdrantConfig:
    """Qdrant vector database configuration."""

    collection_name: str
    host: str


@dataclass(frozen=True)
class OllamaConfig:
    """Ollama LLM configuration."""

    url: str
    model: str
    timeout: int


@dataclass(frozen=True)
class LangfuseConfig:
    """Langfuse observability configuration."""

    enabled: bool
    secret_key: str
    public_key: str
    base_url: str
    prompt_summary: str
    prompt_system: str


@dataclass(frozen=True)
class RedisConfig:
    """Redis configuration."""

    host: str
    port: int
    db: int
    password: str | None
    conversation_expiry_seconds: int
    max_history_messages: int


@dataclass(frozen=True)
class OpenAIConfig:
    """OpenAI API configuration."""

    enabled: bool
    api_key: str
    model: str
    timeout: int


@dataclass(frozen=True)
class ElevenLabsConfig:
    """ElevenLabs API configuration."""

    api_key: str
    voice_id: str


@dataclass(frozen=True)
class LangWatchConfig:
    """LangWatch observability configuration."""

    enabled: bool
    api_key: str
    prompt_system: str


@dataclass(frozen=True)
class ScrapingConfig:
    """Web scraping configuration."""

    max_concurrent_scrapes: int


@dataclass(frozen=True)
class EnvConfig:
    """Root configuration container."""

    filesystem: FilesystemConfig
    qdrant: QdrantConfig
    ollama: OllamaConfig
    openai: OpenAIConfig
    langfuse: LangfuseConfig
    langwatch: LangWatchConfig
    redis: RedisConfig
    elevenlabs: ElevenLabsConfig
    scraping: ScrapingConfig
    huggingface_token: str


def _load_config() -> EnvConfig:
    """Load all configuration from environment variables."""
    return EnvConfig(
        filesystem=FilesystemConfig(
            cache_dir_json=_get_required("CACHE_DIR_JSON"),
            cache_dir_flat=_get_required("CACHE_DIR_FLAT"),
            cache_dir_summaries=_get_required("CACHE_DIR_SUMMARIES"),
            cache_dir_prompts=_get_required("CACHE_DIR_PROMPTS"),
        ),
        qdrant=QdrantConfig(
            collection_name=_get_required("QDRANT_COLLECTION_NAME"),
            host=_get_required("QDRANT_HOST"),
        ),
        ollama=OllamaConfig(
            url=_get_required("OLLAMA_URL"),
            model=_get_required("OLLAMA_MODEL"),
            timeout=_get_int("OLLAMA_TIMEOUT", 600),
        ),
        openai=OpenAIConfig(
            enabled=_get_optional("OPENAI_ENABLE", "false").lower() == "true",
            api_key=_get_optional("OPENAI_API_KEY"),
            model=_get_optional("OPENAI_MODEL", "gpt-4o"),
            timeout=_get_int("OPENAI_TIMEOUT", 120),
        ),
        langfuse=LangfuseConfig(
            enabled=_get_optional("LANGFUSE_ENABLE", "false").lower() == "true",
            secret_key=_get_optional("LANGFUSE_SECRET_KEY"),
            public_key=_get_optional("LANGFUSE_PUBLIC_KEY"),
            base_url=_get_optional("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"),
            prompt_summary=_get_optional("LANGFUSE_PROMPT_SUMMARY", "ContentSummarizer"),
            prompt_system=_get_optional("LANGFUSE_PROMPT_SYSTEM", "macular-society-system-prompt"),
        ),
        langwatch=LangWatchConfig(
            enabled=_get_optional("LANGWATCH_ENABLE", "false").lower() == "true",
            api_key=_get_optional("LANGWATCH_API_KEY"),
            prompt_system=_get_optional("LANGWATCH_PROMPT_SYSTEM", "macular-society-system-prompt"),
        ),
        redis=RedisConfig(
            host=_get_optional("REDIS_HOST", "localhost"),
            port=_get_int("REDIS_PORT", 6379),
            db=_get_int("REDIS_DB", 0),
            password=_get_optional("REDIS_PASSWORD") or None,
            conversation_expiry_seconds=_get_int("CONVERSATION_EXPIRY_SECONDS", 86400),
            max_history_messages=_get_int("MAX_HISTORY_MESSAGES", 20),
        ),
        elevenlabs=ElevenLabsConfig(
            api_key=_get_optional("ELEVENLABS_API_KEY"),
            voice_id=_get_optional("ELEVENLABS_VOICE_ID"),
        ),
        scraping=ScrapingConfig(
            max_concurrent_scrapes=_get_int("MAX_CONCURRENT_SCRAPES", 5),
        ),
        huggingface_token=_get_optional("HUGGINGFACE_TOKEN"),
    )


# Singleton config instance - loaded once at import
env = _load_config()
