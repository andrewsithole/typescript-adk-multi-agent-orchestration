import { BaseAgent, InvocationContext, LlmAgent, GOOGLE_SEARCH, stringifyContent } from '@google/adk';
import { webScrapeTool } from '../tools/scraper.js';
import { createLogger } from '../logger.js';

const log = createLogger('researcher');

// Sub-agents for the two possible paths.

// Path A: No link in query -> search only, output becomes researcher_output.
const searchAgent = new LlmAgent({
    name: 'researcher_search',
    model: 'gemini-2.5-flash',
    description: 'Uses Google Search to find authoritative sources and candidate pages.',
    instruction: (ctx) => {
        const judgeOutput = ctx.invocationContext.session.state['judge_output'];
        log.debug('instruction called (search)', {
            hasJudgeFeedback: !!judgeOutput,
            judgeFeedback: judgeOutput ? JSON.stringify(judgeOutput) : null,
        });
        return [
            'You are an expert web researcher focused on precision and credibility.',
            'Use google_search to locate the most relevant, recent, and authoritative pages for the user request.',
            'Return a concise summary of findings with 3–6 cited URLs. Do not use any other tools.',
        ].join(' ');
    },
    outputKey: 'researcher_output',
    tools: [GOOGLE_SEARCH],
});

// Path B: Link(s) present -> scrape first (collect content), then process using the user request.
const scrapeCollector = new LlmAgent({
    name: 'researcher_scrape',
    model: 'gemini-2.5-flash',
    description: 'Scrapes provided URLs and compiles readable text snippets.',
    instruction: () => [
        'You will receive a user message that may contain one or more URLs.',
        'Identify all URLs in the user message and use the web_scrape tool to fetch each URL. '
        + 'If multiple links are present, call the tool multiple times (once per URL).',
        'For each page: extract the most relevant sections and keep them as clean text.',
        'Do not summarize yet. Output a compiled, clearly delimited block per URL with the source URL heading.',
    ].join(' '),
    outputKey: 'scraped_content',
    tools: [webScrapeTool],
});

const processAgent = new LlmAgent({
    name: 'researcher_process',
    model: 'gemini-2.5-flash',
    description: 'Processes scraped content according to the user request and produces final research output.',
    instruction: (ctx) => {
        const scraped = ctx.invocationContext.session.state['scraped_content'];
        const scrapedText = scraped ? stringifyContent(scraped as any) : '(no scraped content)';
        log.debug('instruction called (process)', {
            hasScraped: !!scraped,
            scrapedSnippet: scrapedText.slice(0, 160),
        });
        return [
            'You have page content extracted from the provided URLs in session state as "scraped_content".',
            'Use the user\'s request (latest user message) to guide what to produce: summarize, analyze, compare, or extract as asked.',
            'Base all claims strictly on the scraped content; include concise citations as [source: <URL>].',
            'If the user provided only a link with no instructions, produce a concise summary of key points and notable quotes.',
        ].join(' ');
    },
    outputKey: 'researcher_output',
    // No tools here — pure processing using provided content.
});

class ConditionalResearcher extends BaseAgent {
    constructor() {
        // Register subagents for proper branching/author labeling, but we control execution.
        super({ name: 'researcher', subAgents: [searchAgent, scrapeCollector, processAgent] });
    }

    protected async *runAsyncImpl(ctx: InvocationContext) {
        // Extract plain text from the invocation's user content.
        const text = stringifyContent({ content: ctx.userContent } as any).trim();

        const urlRegex = /https?:\/\/[^\s)>'"]+/gi;
        const urls = Array.from(text.matchAll(urlRegex)).map(m => m[0]);
        const hasUrl = urls.length > 0;
        log.debug('router decision', { hasUrl, urlCount: urls.length });

        if (hasUrl) {
            // Scrape first, then process with the user request + scraped content.
            for await (const ev of scrapeCollector.runAsync(ctx)) {
                yield ev;
            }
            for await (const ev of processAgent.runAsync(ctx)) {
                yield ev;
            }
        } else {
            // No link: do search only and produce the final research output.
            for await (const ev of searchAgent.runAsync(ctx)) {
                yield ev;
            }
        }
    }

    protected async *runLiveImpl(ctx: InvocationContext) {
        yield* this.runAsyncImpl(ctx);
    }
}

export const researcher = new ConditionalResearcher();
