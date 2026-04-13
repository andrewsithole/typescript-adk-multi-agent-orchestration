import {
    BaseAgent,
    InvocationContext,
    createEvent,
    createEventActions,
} from '@google/adk';
import { createLogger } from '../logger.js';

const log = createLogger('escalation_checker');

export default class EscalationChecker extends BaseAgent {
    protected async *runAsyncImpl(ctx: InvocationContext) {
        const lastOutput = ctx.session.state['judge_output'] as
            | { status?: string; feedback?: string }
            | undefined;

        log.debug('judge_output from state', {
            type: typeof lastOutput,
            value: JSON.stringify(lastOutput),
            parsedStatus: lastOutput?.status,
            willEscalate: lastOutput?.status === 'pass',
        });

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
