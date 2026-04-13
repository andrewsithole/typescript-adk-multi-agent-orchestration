// Gate to prevent formatting when research quality did not pass after the loop

// 2. Create the Formatting Layer (Twitter & LinkedIn in parallel)
import {theProfessional} from "./theProfessional.js";

const formatters = new ParallelAgent({
    name: 'formatters',
    subAgents: [
        new ProgressWrapper(threadWhiz, 'Crafting Twitter thread…', 'Twitter thread ready.', { name: 'twitter_progress' }),
        new ProgressWrapper(theProfessional, 'Writing LinkedIn post…', 'LinkedIn post ready.', { name: 'linkedin_progress' }),
    ],
});


import {BaseAgent, createEvent, type InvocationContext, ParallelAgent} from "@google/adk";
import ProgressWrapper from "./ProgressChecker.js";
import {threadWhiz} from "./threadWhiz.js";

export default class FormattersGate extends BaseAgent {
    constructor() {
        super({ name: 'format_gate', subAgents: [formatters] });
    }

    protected async *runAsyncImpl(ctx: InvocationContext) {
        const judge = ctx.session.state['judge_output'] as { status?: string; feedback?: string } | undefined;
        const passed = (judge?.status || '').toLowerCase() === 'pass';
        if (!passed) {
            // Do not proceed to formatters; guide the user briefly.
            yield createEvent({
                author: this.name,
                content: { role: 'model', parts: [{ text: 'Skipping formatting because research did not pass the quality check. Try refining your query or providing additional context.' }] },
            });
            return;
        }
        // Pipe all events from formatters if quality passed.
        for await (const ev of formatters.runAsync(ctx)) {
            yield ev;
        }
    }

    protected async *runLiveImpl(ctx: InvocationContext) {
        yield* this.runAsyncImpl(ctx);
    }
}