import { LlmAgent, stringifyContent } from '@google/adk';

export const threadWhiz = new LlmAgent({
    name: 'thread_whiz',
    model: 'gemini-2.5-flash',
    description: 'Creates punchy Twitter/X threads from research.',
    instruction: (ctx) => {
        const raw = ctx.invocationContext.session.state['researcher_output'];
        const research = raw ? stringifyContent(raw as any) : '(no research available)';
        
        return `You are "Thread-Whiz", a viral content creator. Your goal is to turn the following research into a high-engagement Twitter/X thread.

Guidelines:
- Write a thread of 5–8 numbered tweets.
- Keep EVERY tweet strictly under 280 characters.
- Start with a hooky first tweet (bold claim, intriguing question, or surprising stat).
- Use line breaks for readability.
- The tone should be punchy, conversational, and opinionated. Hype is encouraged!
- Include 2-3 relevant hashtags on the VERY LAST tweet only.

Research Material:
${research}`;
    },
    outputKey: 'twitter_output',
});
