import { FunctionTool } from '@google/adk';
import { parse } from 'node-html-parser';
import { z } from 'zod';

// Simple in-memory TTL cache for preprocessed blocks per URL
type Block = { heading?: string; text: string };
type CacheEntry = { expiresAt: number; blocks: Block[]; title?: string };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60_000; // 10 minutes
const TIMEOUT_MS = 10_000; // 10 seconds
const MAX_CHARS = 6000; // cap returned text size

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','than','that','this','those','these','for','to','of','in','on','with','by','as','at','is','it','be','are','was','were','from','about','into','over','after','before','not','no','yes','you','your','we','our','us'
]);

const isHttpUrl = (url: string) => {
  try {
    const u = new URL(url);
    if (!(u.protocol === 'http:' || u.protocol === 'https:')) return false;
    const host = u.hostname.toLowerCase();
    // Basic SSRF guard: disallow localhost and obvious private hosts
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false;
    if (host.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
};

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t && !STOPWORDS.has(t));
}

function score(text: string, qTokens: string[]): number {
  if (qTokens.length === 0) return 0;
  const tks = tokenize(text);
  if (tks.length === 0) return 0;
  let hits = 0;
  const set = new Set(tks);
  for (const t of qTokens) if (set.has(t)) hits++;
  return hits;
}

function extractBlocks(html: string): { blocks: Block[]; title: string } {
  const root = parse(html);
  // Remove noisy elements
  root.querySelectorAll('script, style, noscript, svg, canvas, iframe, footer, header, nav, aside').forEach(el => el.remove());

  const title = root.querySelector('title')?.text?.trim();

  // Walk headings and group following paragraphs until next heading of same or higher level
  const blocks: Block[] = [];
  const headings = root.querySelectorAll('h1, h2, h3');
  if (headings.length > 0) {
    for (const h of headings) {
      const level = Number(h.tagName?.slice(1) || 3);
      const headingText = h.text.trim().replace(/\s+/g, ' ');
      let text = '';
      let cur = h.nextElementSibling;
      while (cur) {
        const tag = (cur as any).tagName?.toLowerCase?.() || '';
        if (tag.match(/^h[1-3]$/)) {
          const nextLevel = Number(tag.slice(1));
          if (nextLevel <= level) break;
        }
        if (tag === 'p' || tag === 'li') {
          const t = cur.text.trim().replace(/\s+/g, ' ');
          if (t.length > 0) text += (text ? ' ' : '') + t;
        }
        cur = cur.nextElementSibling;
      }
      if (text) blocks.push({ heading: headingText, text });
    }
  }

  // Fallback: take first N paragraphs if no heading structure
  if (blocks.length === 0) {
    const paras = root.querySelectorAll('p');
    let text = '';
    for (const p of paras.slice(0, 8)) {
      const t = p.text.trim().replace(/\s+/g, ' ');
      if (t) text += (text ? ' ' : '') + t;
    }
    if (text) blocks.push({ text });
  }

  return { blocks, title: title ??'' };
}

async function fetchHtml(url: string): Promise<string> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const resp = await (globalThis as any).fetch(url, { signal: ac.signal });
    if (!resp?.ok) throw new Error(`fetch failed: ${resp?.status} ${resp?.statusText}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

export const webScrapeTool = new FunctionTool({
  name: 'web_scrape',
  description: 'Fetch and extract key sections (headings + relevant paragraphs) from a URL',
  parameters: z.object({
    url: z.string().url(),
    q: z.string().max(1000).optional(),
    maxChars: z.number().int().positive().max(20000).optional(),
  }),
  execute: async ({ url, q, maxChars }: { url: string; q?: string|undefined; maxChars?: number|undefined }) => {
    try {
      if (!isHttpUrl(url)) return 'Error: Only http(s) URLs are allowed.';

      const now = Date.now();
      let cached = CACHE.get(url);
      if (!cached || cached.expiresAt < now) {
        const html = await fetchHtml(url);
        const { blocks, title } = extractBlocks(html);
        cached = { expiresAt: now + TTL_MS, blocks, title };
        CACHE.set(url, cached);
      }

      const limit = Math.min(maxChars || MAX_CHARS, 20000);
      const qTokens = q ? tokenize(q) : [];

      // Score and select blocks
      const scored = cached.blocks.map(b => ({ b, s: qTokens.length ? score((b.heading ? b.heading + ' ' : '') + b.text, qTokens) : 0 }));
      scored.sort((a, b) => b.s - a.s);

      const ordered = scored.length && qTokens.length ? scored.map(x => x.b) : cached.blocks;

      // Build output: title + up to limit chars from top blocks
      let out = '';
      if (cached.title) out += `TITLE: ${cached.title}\n`;
      for (const blk of ordered) {
        const secHeader = blk.heading ? `\n## ${blk.heading}\n` : (out ? '\n' : '');
        const chunk = (secHeader + blk.text).slice(0, Math.max(0, limit - out.length));
        if (chunk.length <= 0) break;
        out += chunk;
        if (out.length >= limit) break;
      }

      return out.trim();
    } catch (err) {
      const msg = (err as Error)?.name === 'AbortError' ? 'Timeout while fetching the URL' : (err as Error).message;
      return `Error: ${msg}`;
    }
  }
});
