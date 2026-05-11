import { LlmAgent, GOOGLE_SEARCH, stringifyContent } from '@google/adk';
import { createLogger } from '../core/logger.js';
import { CONFIG } from '../core/config.js';

const log = createLogger('researcher');

/**
 * Researcher Agent
 * 
 * This agent uses Google Search to find authoritative sources and findings 
 * based on the user's request. It is designed to work within a loop where 
 * it can receive feedback from a Judge agent to refine its search.
 */
export const researcher = new LlmAgent({
    name: 'researcher',
    model: CONFIG.DEFAULT_MODEL,
    description: 'Uses Google Search to find authoritative sources and candidate pages.',
    instruction: (ctx) => {
        log.debug('Starting researcher instruction generation');
        
        const state = ctx.invocationContext.session.state;
        const judgeOutput = state['judge_output'] as { status?: string; feedback?: string } | undefined;
        
        // Extract the user's original query or the latest instruction
        const userContent = stringifyContent({ content: ctx.invocationContext.userContent } as any).trim();
        
        log.info('Researcher processing request', {
            userQuery: userContent.slice(0, 100),
            hasJudgeFeedback: !!judgeOutput,
            judgeStatus: judgeOutput?.status,
            judgeFeedback: judgeOutput?.feedback?.slice(0, 100),
        });

        if (judgeOutput?.feedback) {
            log.info('Applying judge feedback to search strategy', { feedback: judgeOutput.feedback });
        }

        const prompt = [
            'You are an expert web researcher focused on precision and credibility.',
            `The user's request is: "${userContent}".`,
            judgeOutput?.feedback 
                ? `Your previous attempt did not pass quality review. Feedback to address: "${judgeOutput.feedback}".` 
                : '',
            'Use google_search to locate the most relevant, recent, and authoritative pages for this request.',
            'Aim for 3–6 cited URLs in your summary. Be factual and avoid speculation.',
            'Return your findings as a concise, structured summary.',
        ].filter(Boolean).join(' ');

        log.debug('Generated prompt for LLM', { promptLength: prompt.length });
        return prompt;
    },
    outputKey: 'researcher_output',
    tools: [GOOGLE_SEARCH],
});
