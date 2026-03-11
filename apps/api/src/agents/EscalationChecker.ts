import {
    BaseAgent,
    InvocationContext,
    createEvent,
    createEventActions,
} from '@google/adk';

export default class EscalationChecker extends BaseAgent {
    protected async *runAsyncImpl(ctx: InvocationContext) {
        const lastOutput = ctx.session.state['judge_output'] as
            | { status?: string; feedback?: string }
            | undefined;

        if (lastOutput?.status === 'pass') {
            // Signal the LoopAgent to exit by setting actions.escalate = true
            yield createEvent({
                author: this.name,
                content: { role: 'model', parts: [{ text: 'Research approved. Moving to content creation.' }] },
                actions: createEventActions({ escalate: true }),
            });
            return;
        }

        yield createEvent({
            author: this.name,
            content: { role: 'model', parts: [{ text: 'Research failed quality check. Retrying...' }] },
        });
    }

    protected async *runLiveImpl(ctx: InvocationContext) {
        // Mirror async behavior for live mode
        yield* this.runAsyncImpl(ctx);
    }
}
