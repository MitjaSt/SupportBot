import { Injectable } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@/config/config.service';

export interface ScrapedPage {
  url: string;
  title: string;
  content: Array<{
    type: 'heading' | 'paragraph';
    level?: number;
    text: string;
  }>;
  scrapedAt: string;
}

// URL prefixes to exclude (matching Python implementation)
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

@Injectable()
export class ScrapingService {
  private readonly maxConcurrent: number;
  private readonly sitemapUrl: string;
  private readonly cacheDir: string;

  constructor(private readonly config: ConfigService) {
    this.maxConcurrent = config.scraping.maxConcurrent;
    this.sitemapUrl = config.scraping.sitemapUrl;
    this.cacheDir = config.filesystem.cacheJsonDir;
  }

  async fetchSitemap(): Promise<string[]> {
    const response = await fetch(this.sitemapUrl);
    const xml = await response.text();

    // Parse URLs from sitemap XML
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(xml)) !== null) {
      const url = match[1];
      // Filter out excluded prefixes
      const path = new URL(url).pathname;
      const isExcluded = EXCLUDED_URL_PREFIXES.some((prefix) =>
        path.startsWith(prefix),
      );
      if (!isExcluded) {
        urls.push(url);
      }
    }

    return urls;
  }

  async scrapePage(browser: Browser, url: string): Promise<ScrapedPage | null> {
    let page: Page | null = null;

    try {
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Extract content from main element
      const result = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return null;

        // Remove unwanted elements
        const unwanted = main.querySelectorAll(
          'nav, footer, script, style, img, video, iframe, form, button',
        );
        unwanted.forEach((el) => el.remove());

        const title = document.querySelector('h1')?.textContent?.trim() ?? '';
        const content: Array<{
          type: 'heading' | 'paragraph';
          level?: number;
          text: string;
        }> = [];

        // Extract headings and paragraphs
        const elements = main.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
        elements.forEach((el) => {
          const text = el.textContent?.trim();
          if (!text) return;

          const tagName = el.tagName.toLowerCase();
          if (tagName.startsWith('h')) {
            content.push({
              type: 'heading',
              level: parseInt(tagName[1]),
              text,
            });
          } else {
            content.push({
              type: 'paragraph',
              text,
            });
          }
        });

        return { title, content };
      });

      if (!result || result.content.length === 0) {
        return null;
      }

      return {
        url,
        title: result.title,
        content: result.content,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error);
      return null;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async scrapeAll(
    onProgress?: (current: number, total: number) => void,
  ): Promise<{ scraped: number; failed: number }> {
    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }

    const urls = await this.fetchSitemap();
    console.log(`Found ${urls.length} URLs to scrape`);

    const browser = await chromium.launch({ headless: true });

    let scraped = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < urls.length; i += this.maxConcurrent) {
      const batch = urls.slice(i, i + this.maxConcurrent);

      const results = await Promise.all(
        batch.map((url) => this.scrapePage(browser, url)),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const url = batch[j];

        if (result) {
          const filename = this.urlToFilename(url);
          await writeFile(
            join(this.cacheDir, filename),
            JSON.stringify(result, null, 2),
          );
          scraped++;
        } else {
          failed++;
        }
      }

      onProgress?.(Math.min(i + batch.length, urls.length), urls.length);
    }

    await browser.close();

    return { scraped, failed };
  }

  async getScrapedFiles(): Promise<string[]> {
    if (!existsSync(this.cacheDir)) {
      return [];
    }
    const files = await readdir(this.cacheDir);
    return files.filter((f) => f.endsWith('.json'));
  }

  async loadScrapedPage(filename: string): Promise<ScrapedPage | null> {
    try {
      const content = await readFile(join(this.cacheDir, filename), 'utf-8');
      return JSON.parse(content) as ScrapedPage;
    } catch {
      return null;
    }
  }

  private urlToFilename(url: string): string {
    const path = new URL(url).pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\//g, '--');
    return `${path || 'index'}.json`;
  }
}
