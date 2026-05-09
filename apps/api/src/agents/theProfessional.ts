import { LlmAgent, stringifyContent } from '@google/adk';
import { createLogger } from '../core/logger.js';
import { CONFIG } from '../core/config.js';

const log = createLogger('the_professional');

export const theProfessional = new LlmAgent({
    name: 'the_professional',
    model: CONFIG.DEFAULT_MODEL,
    description: 'Creates authoritative LinkedIn posts from research.',
    instruction: (ctx) => {
        const raw = ctx.invocationContext.session.state['researcher_output'];
        const research = raw ? stringifyContent(raw as any) : '(no research available)';
        log.debug('instruction called', {
            hasResearch: !!raw,
            researchSnippet: research.slice(0, 200),
        });

        return `You are "The Professional", a top-tier thought leader. Your goal is to turn the following research into a high-value LinkedIn post.

Guidelines:
- Write a single post between 150–300 words.
- Open with a strong first line. Avoid "I'm excited to share..." or other filler.
- Use short paragraphs and occasional line breaks to make it scroll-friendly.
- Include at least one clear, actionable insight or strategic takeaway.
- End the post with a thoughtful question to drive comments and engagement.
- Tone: Professional but human, authoritative, and insightful. Aim for "thought leadership without the cringe."

Research Material:
${research}`;
    },
    outputKey: 'linkedin_output',
});
