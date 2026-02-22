// orchestrator.ts
import {
    SequentialAgent,
    LoopAgent,
    BaseAgent,
    InvocationContext,
    createEvent,
    createEventActions,
} from '@google/adk';
import { researcher } from './researcher.js';
import { judge } from './judge.js';

// The "Escalation Checker" - Deterministic logic to break the loop
class EscalationChecker extends BaseAgent {
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

// 1. Create the Research Loop (Researcher -> Judge -> Checker)
const researchLoop = new LoopAgent({
    name: 'research_loop',
    subAgents: [researcher, judge, new EscalationChecker({ name: 'checker' })],
    maxIterations: 3,
});

// 2. Create the Final Pipeline
export const courseCreator = new SequentialAgent({
    name: 'course_creator_pipeline',
    description: 'Researches and builds a course.',
    subAgents: [researchLoop], // You would add a ContentBuilder agent here next
});
