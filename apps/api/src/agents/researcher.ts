import { LlmAgent, GOOGLE_SEARCH } from '@google/adk';
import {webScrapeTool} from "../tools/scraper.js";
import { createLogger } from '../logger.js';

const log = createLogger('researcher');

export const researcher = new LlmAgent({
    name: 'researcher',
    model: 'gemini-2.5-flash',
    description: 'Gathers information using Google Search and web scraping.',
    instruction: (ctx) => {
        const existingOutput = ctx.invocationContext.session.state['researcher_output'];
        const judgeOutput = ctx.invocationContext.session.state['judge_output'];
        log.debug('instruction called', {
            hasExistingOutput: !!existingOutput,
            hasJudgeFeedback: !!judgeOutput,
            judgeFeedback: judgeOutput ? JSON.stringify(judgeOutput) : null,
        });
        return 'You are an expert researcher. Use the search tool to find facts and web_scrape to read specific pages.';
    },
    outputKey: 'researcher_output',
    tools: [GOOGLE_SEARCH, webScrapeTool],
});

