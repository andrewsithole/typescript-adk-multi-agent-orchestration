import { LlmAgent, stringifyContent } from '@google/adk';
import { createLogger } from '../core/logger.js';

const log = createLogger('formatter');

export const formatter = new LlmAgent({
    name: 'formatter',
    model: 'gemini-2.5-flash',
    description: 'Formats approved research into a structured course.',
    instruction: (ctx) => {
        const raw = ctx.invocationContext.session.state['researcher_output'];
        const research = raw ? stringifyContent(raw as any) : '(no research available)';
        log.debug('instruction called', { hasResearch: !!raw, researchSnippet: research.slice(0, 200) });
        return `You are a course designer. Using the research notes provided,
      produce a complete, well-structured course with clear modules, objectives,
      and content sections.\n\nResearch:\n${research}`;
    },
})