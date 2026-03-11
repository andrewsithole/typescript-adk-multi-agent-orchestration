import { LlmAgent, GOOGLE_SEARCH } from '@google/adk';
import { webScrapeTool } from '../tools/scraper.js';

export const researcher = new LlmAgent({
    name: 'researcher',
    model: 'gemini-2.5-flash',
    description: 'Gathers information using Google Search and web scraping.',
    instruction: 'You are an expert researcher. Use the search tool to find facts and web_scrape to read specific pages.',
    outputKey: 'researcher_output',
    tools: [GOOGLE_SEARCH, webScrapeTool],
});

