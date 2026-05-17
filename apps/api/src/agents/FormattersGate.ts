import { BaseAgent, createEvent, type InvocationContext, ParallelAgent } from "@google/adk";
import { theProfessional } from "./theProfessional.js";
import { threadWhiz } from "./threadWhiz.js";
import ProgressWrapper from "./ProgressChecker.js";

/**
 * The Formatting Layer runs Twitter & LinkedIn agents in parallel.
 * We wrap them in ProgressWrapper to provide UI feedback.
 */
const formatters = new ParallelAgent({
    name: 'formatters_internal',
    subAgents: [
        new ProgressWrapper(threadWhiz, 'Crafting Twitter thread...', 'Twitter thread ready.', { name: 'twitter_progress' }),
        new ProgressWrapper(theProfessional, 'Writing LinkedIn post...', 'LinkedIn post ready.', { name: 'linkedin_progress' }),
    ],
});

/**
 * FormattersGate prevents the formatting stage from running if the 
 * research quality did not pass the Judge's evaluation.
 */
export default class FormattersGate extends BaseAgent {
    constructor() {
        super({ name: 'format_gate', subAgents: [formatters] });
    }

    protected async *runAsyncImpl(ctx: InvocationContext) {
        const judge = ctx.session.state['judge_output'] as { status?: string; feedback?: string } | undefined;
        const passed = (judge?.status || '').toLowerCase() === 'pass';

        if (!passed) {
            // Do not proceed to formatters; notify the user.
            yield createEvent({
                author: this.name,
                content: { role: 'model', parts: [{ text: 'Skipping formatting because research did not pass the quality check. Try refining your query or providing additional context.' }] },
            });
            return;
        }

        // If quality passed, run the formatters and yield all their events.
        for await (const ev of formatters.runAsync(ctx)) {
            yield ev;
        }
    }

    protected async *runLiveImpl(ctx: InvocationContext) {
        yield* this.runAsyncImpl(ctx);
    }
}
