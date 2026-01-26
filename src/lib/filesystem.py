def sanitize_filename(text: str, max_length: int = 50) -> str:
    import re

    # Replace whitespace with underscores
    text = re.sub(r"\s+", "_", text)
    # Remove invalid filename characters
    text = re.sub(r'[<>:"/\\|?*]', "", text)
    # Limit length
    text = text[:max_length]
    # Remove trailing underscores or dots
    text = text.rstrip("_.")
    return text.lower()
