/**
 * Standalone scraping script — run outside the API container.
 *
 * Usage:
 *   npm run scrape
 *   # or directly:
 *   ts-node -r tsconfig-paths/register scripts/scrape.ts
 *
 * Requires playwright to be installed with its browsers:
 *   npm install playwright
 *   npx playwright install chromium
 */
import { config } from 'dotenv';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

config({ path: resolve(__dirname, '../../../../.env') });

interface ScrapedPage {
  url: string;
  title: string;
  content: Array<{
    type: 'heading' | 'paragraph';
    level?: number;
    text: string;
  }>;
  scrapedAt: string;
}

const EXCLUDED_URL_PREFIXES = [
  '/404',
  '/events/',
  '/media/',
  '/news/',
  '/search',
  '/shop/',
  '/donate/',
  '/membership/',
];

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Required env var '${key}' is not set`);
  }
  return value;
}

async function fetchSitemap(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl);
  const xml = await response.text();

  const urlRegex = /<loc>(.*?)<\/loc>/g;
  const urls: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(xml)) !== null) {
    const url = match[1];
    const path = new URL(url).pathname;
    if (!EXCLUDED_URL_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      urls.push(url);
    }
  }

  return urls;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scrapePage(browser: any, url: string): Promise<ScrapedPage | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let page: any = null;
  try {
    page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const result = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;

      const unwanted = main.querySelectorAll(
        'nav, footer, script, style, img, video, iframe, form, button',
      );
      unwanted.forEach((el: Element) => el.remove());

      const title = document.querySelector('h1')?.textContent?.trim() ?? '';
      const content: Array<{ type: 'heading' | 'paragraph'; level?: number; text: string }> = [];

      const elements = main.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
      elements.forEach((el: Element) => {
        const text = el.textContent?.trim();
        if (!text) return;
        const tag = el.tagName.toLowerCase();
        if (tag.startsWith('h')) {
          content.push({ type: 'heading', level: parseInt(tag[1]), text });
        } else {
          content.push({ type: 'paragraph', text });
        }
      });

      return { title, content };
    });

    if (!result || result.content.length === 0) return null;

    return { url, title: result.title, content: result.content, scrapedAt: new Date().toISOString() };
  } catch (err) {
    console.error(`  Failed: ${url}`, err);
    return null;
  } finally {
    if (page) await page.close();
  }
}

function urlToFilename(url: string): string {
  const path = new URL(url).pathname
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\//g, '--');
  return `${path || 'index'}.json`;
}

async function main() {
  const sitemapUrl = getEnv('SITEMAP_URL', 'https://www.macularsociety.org/sitemap.xml');
  const cacheDir = getEnv('CACHE_DIR_JSON');
  const maxConcurrent = parseInt(process.env['MAX_CONCURRENT_SCRAPES'] ?? '5', 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playwright: any;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('Playwright is not installed. Run: npm install playwright && npx playwright install chromium');
    process.exit(1);
  }

  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }

  console.log(`Fetching sitemap from ${sitemapUrl}...`);
  const urls = await fetchSitemap(sitemapUrl);
  console.log(`Found ${urls.length} URLs to scrape`);

  const browser = await playwright.chromium.launch({ headless: true });
  let scraped = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const results = await Promise.all(batch.map((url) => scrapePage(browser, url)));

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result) {
        await writeFile(join(cacheDir, urlToFilename(batch[j])), JSON.stringify(result, null, 2));
        scraped++;
      } else {
        failed++;
      }
    }

    console.log(`Progress: ${Math.min(i + batch.length, urls.length)}/${urls.length}`);
  }

  await browser.close();
  console.log(`Done — scraped: ${scraped}, failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
