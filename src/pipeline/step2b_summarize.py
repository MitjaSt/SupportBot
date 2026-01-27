"""
LLM-based summarization of flattened text files.
Reads files from flat/ folder, generates summaries via Ollama, and saves to summaries/.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from langfuse import Langfuse
from loguru import logger
from tqdm import tqdm

from src.lib.env import env

# Maximum concurrent summarization requests
MAX_WORKERS = 3

# ------------------------
# Langfuse prompt
# ------------------------
_langfuse_client: Langfuse | None = None
_prompt_template = None


def _get_langfuse_client() -> Langfuse:
    """Get or create Langfuse client."""
    global _langfuse_client
    if _langfuse_client is None:
        _langfuse_client = Langfuse(
            secret_key=env.langfuse.secret_key,
            public_key=env.langfuse.public_key,
            host=env.langfuse.base_url,
        )
    return _langfuse_client


def _get_summarization_prompt(text: str) -> str:
    """Fetch and compile the summarization prompt from Langfuse."""
    global _prompt_template
    if _prompt_template is None:
        client = _get_langfuse_client()
        _prompt_template = client.get_prompt(env.langfuse.prompt_summary)
        logger.debug(f"Fetched and cached {env.langfuse.prompt_summary} prompt from Langfuse")
    return _prompt_template.compile(text=text)


def summarize_text(text: str) -> str:
    """
    Generate a summary of the text using Ollama.

    Args:
        text: The text to summarize

    Returns:
        The generated summary
    """
    prompt = _get_summarization_prompt(text)

    data = {
        "model": env.ollama.model,
        "stream": False,
        "messages": [
            {"role": "user", "content": prompt},
        ],
    }

    response = requests.post(
        f"{env.ollama.url}/api/chat", json=data, timeout=env.ollama.timeout
    )
    response.raise_for_status()
    response_json = response.json()

    message = response_json.get("message", {})
    return message.get("content", "").strip()


def process_file(filepath: Path, output_dir: Path) -> dict:
    """
    Process a single file: read, summarize, and save.
    Skips files that already have summaries.

    Args:
        filepath: Path to the input text file
        output_dir: Directory to save the summary

    Returns:
        dict with processing stats
    """
    # Check if summary already exists
    output_path = output_dir / filepath.name
    if output_path.exists():
        return {"file": filepath.name, "status": "skipped", "reason": "already summarized"}

    with open(filepath, encoding="utf-8") as f:
        text = f.read()

    if not text.strip():
        return {"file": filepath.name, "status": "skipped", "reason": "empty file"}

    try:
        summary = summarize_text(text)

        # Save summary with same filename
        output_path = output_dir / filepath.name
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(summary)

        return {
            "file": filepath.name,
            "status": "success",
            "original_length": len(text),
            "summary_length": len(summary),
        }
    except Exception as e:
        logger.error(f"Failed to summarize {filepath.name}: {e}")
        return {"file": filepath.name, "status": "error", "error": str(e)}


def main():
    flat_dir = Path(env.filesystem.cache_dir_flat)
    output_dir = Path(env.filesystem.cache_dir_summaries)

    if not flat_dir.exists():
        raise FileNotFoundError(f"Directory not found: {env.filesystem.cache_dir_flat}")

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    txt_files = list(flat_dir.glob("*.txt"))

    if not txt_files:
        raise ValueError(f"No .txt files found in {env.filesystem.cache_dir_flat}")

    print(f"\nFound {len(txt_files)} files to summarize")
    print("Configuration:")
    print(f"  - Input directory: {env.filesystem.cache_dir_flat}")
    print(f"  - Output directory: {env.filesystem.cache_dir_summaries}")
    print(f"  - LLM model: {env.ollama.model}")
    print(f"  - Ollama URL: {env.ollama.url}")
    print(f"  - Concurrent workers: {MAX_WORKERS}\n")

    success_count = 0
    error_count = 0
    already_done_count = 0
    empty_count = 0

    # Process files concurrently with progress bar
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_file, filepath, output_dir): filepath
            for filepath in txt_files
        }

        for future in tqdm(as_completed(futures), total=len(txt_files), desc="Summarizing files"):
            filepath = futures[future]
            try:
                stats = future.result()

                if stats["status"] == "success":
                    success_count += 1
                elif stats["status"] == "error":
                    error_count += 1
                elif stats.get("reason") == "already summarized":
                    already_done_count += 1
                else:
                    empty_count += 1
            except Exception as e:
                logger.error(f"Unexpected error processing {filepath.name}: {e}")
                error_count += 1

    print(f"\n{'=' * 80}")
    print("Summarization complete!")
    print(f"{'=' * 80}")
    print(f"Files processed: {len(txt_files)}")
    print(f"  - New summaries: {success_count}")
    print(f"  - Already done: {already_done_count}")
    print(f"  - Empty files: {empty_count}")
    print(f"  - Errors: {error_count}")
    print(f"Summaries saved to: {env.filesystem.cache_dir_summaries}")
    print(f"{'=' * 80}\n")


if __name__ == "__main__":
    main()
