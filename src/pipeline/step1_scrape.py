import asyncio
import json
import os
import xml.etree.ElementTree as ET

import requests
from dotenv import load_dotenv
from loguru import logger
from playwright.async_api import async_playwright

load_dotenv()

# Ensure cache directory exists
os.makedirs(os.getenv("CACHE_DIR_JSON", ""), exist_ok=True)

BASE_URL = "https://www.macularsociety.org"
SITEMAP_URL = f"{BASE_URL}/sitemap.xml"

EXCLUDED_URL_PREFIXES = ["404", "about/media", "support/events"]


def should_exclude_url(url):
    """Check if URL should be excluded based on EXCLUDED_URL_PREFIXES."""
    return any(prefix in url for prefix in EXCLUDED_URL_PREFIXES)


# Step 1: Parse sitemap
def get_sitemap_urls(sitemap_url):
    response = requests.get(sitemap_url)
    response.raise_for_status()
    root = ET.fromstring(response.content)
    namespace = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = []
    for url in root.findall("ns:url", namespace):
        loc = url.find("ns:loc", namespace)
        if loc is not None and loc.text:
            urls.append(loc.text)
    return urls


# Step 2: Use Playwright to scrape each page
async def scrape_page(url, page):
    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle")

    # Remove known unwanted nodes
    await page.evaluate("""
        () => {
            const selectors = [
                "#video",
                "img",
                ".notification-banner",
                ".image-section__overlay__card",
                ".img-with-footer",
                "video",
                ".on-this-page",
                "cta-panel",
                "[aria-hidden='true']",
                ".mini-promo",
                "footer",
                "nav",
                ".header",
                "cky-btn-revisit-wrapper",
            ];
            document.querySelectorAll(selectors.join(",")).forEach(el => el.remove());
        }
    """)

    # All direct children of <main>
    elements = await page.locator("main h1, main h2, main h3, main p").all()
    structured = []
    current_section = {"heading": None, "content": []}

    for el in elements:
        tag = await el.evaluate("e => e.tagName")
        text = (await el.inner_text()).strip()
        if not text:
            continue

        if tag.startswith("H"):  # heading
            if current_section["content"]:
                structured.append(current_section)
            current_section = {"heading": text, "content": []}
        else:  # paragraph
            current_section["content"].append(text)

    if current_section["content"]:
        structured.append(current_section)

    title = await page.title()

    return {"url": url, "title": title, "content": structured}


def url_to_filename(url):
    """Convert a URL to a safe JSON filename by replacing slashes with double dashes."""
    # Remove base URL
    path = url.replace(BASE_URL, "")
    # Remove leading/trailing slashes
    path = path.strip("/")
    # Replace / with --
    filename = path.replace("/", "--")
    # Fallback for home page
    if not filename:
        filename = "home"
    # Add .json extension
    return filename + ".json"


def save_page_json(page_data):
    """Save scraped page data to a JSON file with a URL-safe filename."""
    url = page_data["url"]
    filename = url_to_filename(page_data["url"])

    filepath = os.path.join(os.getenv("CACHE_DIR_JSON", ""), filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(page_data, f, ensure_ascii=False, indent=4)  # pretty multiline JSON

    logger.info(f"Saved {url} -> {filepath}")


async def scrape_and_save(url, browser, semaphore):
    """Scrape a single URL and save it to JSON."""
    async with semaphore:
        page = await browser.new_page()
        try:
            result = await scrape_page(url, page)
            save_page_json(result)
            logger.info(f"Scraped: {url}")
            return result
        except Exception as e:
            logger.error(f"Failed to scrape {url}: {e}")
            return None
        finally:
            await page.close()


async def main():
    all_urls = get_sitemap_urls(SITEMAP_URL)

    # Filter out excluded URLs
    urls = [url for url in all_urls if not should_exclude_url(url)]
    excluded_count = len(all_urls) - len(urls)

    logger.info(f"Found {len(all_urls)} URLs in sitemap")
    logger.info(f"Excluded {excluded_count} URLs based on EXCLUDED_URL_PREFIXES")
    logger.info(f"Processing {len(urls)} URLs")

    # Limit concurrent requests to avoid overwhelming the server
    max_concurrent = int(os.getenv("MAX_CONCURRENT_SCRAPES", "5"))
    semaphore = asyncio.Semaphore(max_concurrent)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # Create tasks for filtered URLs
        tasks = [scrape_and_save(url, browser, semaphore) for url in urls]

        # Run all tasks concurrently
        results = await asyncio.gather(*tasks)

        await browser.close()

    # Filter out None results (failed scrapes)
    successful_results = [r for r in results if r is not None]
    logger.info(f"Scraped {len(successful_results)}/{len(urls)} pages successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n")  # New line after ^C
        logger.info("Goodbye! 👋")
    except EOFError:
        print("\n")  # New line after ^D
        logger.info("Goodbye! 👋")
