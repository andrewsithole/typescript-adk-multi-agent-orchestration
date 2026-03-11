import { FunctionTool } from '@google/adk';
import { parse } from 'node-html-parser';
import { z } from 'zod';

export const webScrapeTool = new FunctionTool({
  name: 'web_scrape',
  description: 'Fetch and extract readable text from a URL',
  parameters: z.object({
    url: z.url(),
  }),
  execute: async ({ url }: { url: string }) => {
    try {
      const response = await (globalThis as any).fetch(url);
      if (!response.ok) {
        return `Error: Failed to fetch URL. Status: ${response.status} ${response.statusText}`;
      }
      const html = await response.text();
      const root = parse(html);

      // Remove script and style elements
      root.querySelectorAll('script, style').forEach(el => el.remove());

      // Get text content and clean up whitespace
      const text = root.textContent.replace(/\s+/g, ' ').trim();

      // Limit length if it's too huge, but usually LLMs handle a few thousand words
      return text.slice(0, 15000);
    } catch (err) {
      return `Error: An unexpected error occurred while scraping the URL. ${(err as Error).message}`;
    }
  }
});
