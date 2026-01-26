import os
from datetime import datetime

import yaml

from src.lib.filesystem import sanitize_filename
from src.lib.model import estimate_tokens
from src.lib.yaml_utils import MultilineYamlDumper

OLLAMA_MODEL = os.environ["OLLAMA_MODEL"]
CACHE_DIR_PROMPTS = os.environ["CACHE_DIR_PROMPTS"]


def log_prompt_response(
    query: str, prompt: str, response: str, chunks: list[str], start_time: float, end_time: float
) -> str:
    """
    Log prompt and response to cache/prompts directory as YAML.

    Returns:
        Path to saved log file
    """
    os.makedirs(CACHE_DIR_PROMPTS, exist_ok=True)

    # Create filename from timestamp and sanitized query
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    sanitized_query = sanitize_filename(query)
    filename = f"{CACHE_DIR_PROMPTS}/{timestamp}_{sanitized_query}.yaml"

    # Estimate token counts
    prompt_tokens = estimate_tokens(prompt)
    query_tokens = estimate_tokens(query)
    response_tokens = estimate_tokens(response)

    log_data = {
        "start_time": datetime.fromtimestamp(start_time).isoformat(),
        "end_time": datetime.fromtimestamp(end_time).isoformat(),
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "chunks": chunks,
        "chunks_length": len(chunks),
        "query": query,
        "response": response,
        "elapsed_seconds": round(end_time - start_time, 2),
        "tokens": {
            "prompt_estimate": prompt_tokens,
            "query_estimate": query_tokens,
            "response_estimate": response_tokens,
            "total_estimate": prompt_tokens + query_tokens + response_tokens,
        },
    }

    with open(filename, "w", encoding="utf-8") as f:
        yaml.dump(
            log_data,
            f,
            Dumper=MultilineYamlDumper,  # type: ignore[arg-type]
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
        )

    return filename
