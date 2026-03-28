import { LlmAgent, zodObjectToSchema, stringifyContent } from '@google/adk';
import { z } from 'zod';
import { createLogger } from '../logger.js';

const log = createLogger('judge');

export const JudgeFeedbackSchema = z.object({
    status: z.enum(['pass', 'fail']),
    scores: z.object({
        freshness: z.number().min(0).max(10),
        excitement: z.number().min(0).max(10),
        accuracy: z.number().min(0).max(10),
        relevancy: z.number().min(0).max(10),
    }),
    feedback: z.string(),
});

export const judge = new LlmAgent({
    name: 'judge',
    model: 'gemini-2.5-flash',
    description: 'Evaluates research findings for social media potential.',
    instruction: (ctx) => {
        const raw = ctx.invocationContext.session.state['researcher_output'];
        const research = raw ? stringifyContent(raw as any) : '(no research available)';
        log.debug('received research to evaluate', {
            hasResearch: !!raw,
            researchSnippet: research.slice(0, 200),
        });
        return `Evaluate the following research for its potential to create high-quality social media content.
        
        Assign a score from 0 to 10 for each of the following criteria:
        1. Freshness: Is this recent/timely or stale news?
        2. Excitement: Does it have hook potential — surprise, strong opinion, or striking data?
        3. Accuracy: Does the research appear factually sound, sourced, and non-speculative?
        4. Relevancy: Does the content stay on-topic and have clear audience value?

        Pass/Fail Logic:
        - Set status to "pass" if the average score is >= 6 AND no single score is below 4.
        - Otherwise, set status to "fail".

        Provide specific feedback on what is missing or how it could be improved if it fails.

        Research:
        ${research}`;
    },
    // Convert Zod schema to GenAI Schema required by ADK
    outputSchema: zodObjectToSchema(JudgeFeedbackSchema),
    outputKey: 'judge_output',
    // Agents with outputSchema should not transfer control
    includeContents: 'none',
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
});

