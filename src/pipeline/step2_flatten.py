import json
import os
import shutil
import sys

from dotenv import load_dotenv
from loguru import logger

load_dotenv()

cache_dir = os.getenv("CACHE_DIR_FLAT", "")
if os.path.exists(cache_dir):
    shutil.rmtree(cache_dir)
os.makedirs(cache_dir, exist_ok=True)

### Example: python chunkify.py macular-disease--macular-conditions--dry-age-related-macular-degeneration.txt

# File filtering configuration
# Exclude files that don't contain valuable content for embeddings/RAG
EXCLUDED_FILE_PREFIXES = [
    "404",  # Error pages - no useful content
    "about--",  # General "about us" pages - not medical/support content
    "unsubscribe",  # Unsubscribe pages - no content value
    "support--support",  # Meta/navigation pages
    "get-involved--fundraising",  # Fundraising pages - not medical/support content
    "get-involved--gift-",  # Gift aid pages - not medical/support content
    "support--events",  # Event listings - time-sensitive, low content value
    "support--daily-life",  # Navigation/index pages
    "about--media--news",  # News articles - time-sensitive content
    "careers--",  # Job listings - not relevant to user queries
    "password-reset",  # Auth pages - no content value
    "shop--",  # E-commerce pages - not medical/support content
    "newsletter",  # Newsletter signup - no content value (duplicate entry in original)
    "home",  # Homepage - typically navigation only
    "livechat",  # Live chat interface - no content value
    "existing-member",  # Member portal - likely login/navigation only
]


# List all files and directories
def get_all_files():
    if sys.argv[1:]:
        return sys.argv[1:]
    else:
        return os.listdir(os.environ["CACHE_DIR_JSON"])


def flatten_page(json_data):
    title = json_data.get("title", "")

    content_blocks = []
    for block in json_data["content"]:
        heading = block.get("heading", "")
        paragraphs = "\n".join(block.get("content", []))
        content_blocks.append(f"{heading}\n{paragraphs}")

    full_text = f"{title}\n\n" + "\n\n".join(content_blocks)
    return full_text


def filter_files(file_list):
    return [f for f in file_list if not any(f.startswith(p) for p in EXCLUDED_FILE_PREFIXES)]


def clear_directory(dir_path):
    if not os.path.exists(dir_path):
        return  # directory doesn't exist
    for filename in os.listdir(dir_path):
        file_path = os.path.join(dir_path, filename)
        if os.path.isfile(file_path) or os.path.islink(file_path):
            os.unlink(file_path)  # remove file or symlink
        elif os.path.isdir(file_path):
            shutil.rmtree(file_path)  # remove directory and its contents


def main():
    clear_directory(os.getenv("CACHE_DIR_FLAT"))
    files = get_all_files()
    all_files_count = len(files)
    files = filter_files(files)
    processed = 0

    for filename in files:
        if filename.endswith(".json"):
            filepath = os.path.join(os.getenv("CACHE_DIR_JSON", ""), filename)

            logger.info(f"Processing file: {filepath}")

            try:
                with open(filepath, encoding="utf-8") as f:
                    data = f.read()
                    json_data = json.loads(data)
                    flat_filepath = os.path.join(
                        os.getenv("CACHE_DIR_FLAT", ""), filename.replace(".json", ".txt")
                    )

                    with open(flat_filepath, "w", encoding="utf-8") as f:
                        f.write(flatten_page(json_data))  # pretty multiline JSON

                    processed += 1
            except Exception as e:
                logger.error(f"Error reading file {filepath}: {e}")

    logger.info(
        f"\nProcessed {processed}/{all_files_count} files into {os.getenv('CACHE_DIR_FLAT', '')}/"
    )


if __name__ == "__main__":
    main()
