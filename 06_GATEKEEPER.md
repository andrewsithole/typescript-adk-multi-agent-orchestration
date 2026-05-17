# Step 6: The Gatekeeper (Conditional Logic)

<div align="center">
  <h3>
    <a href="./05_PARALLEL_FORMATTERS.md">⬅️ Back: Parallel Formatters</a> | 
    <b>Step 6: Gatekeepers</b> | 
    <a href="./07_PROGRESS.md">Next: Progress Wrappers ➡️</a>
  </h3>
</div>

In Step 5, we added formatters to our pipeline. However, if the **Judge** fails the research (even after multiple retries), we probably shouldn't waste time generating social media posts from bad data.

We need a **Gatekeeper**.

---

## 🧠 Key Concepts: Conditional Execution

While ADK has a `SequentialAgent`, it doesn't have a built-in "IfAgent." Instead, we handle conditional logic by creating a custom agent that extends `BaseAgent`.

A Gatekeeper agent:
1.  **Reads the State:** It checks `judge_output` in the session state to see if the status is "pass".
2.  **Decides:** If it passed, it runs its sub-agents (the formatters).
3.  **Signals:** If it failed, it sends a message to the user explaining why it's skipping the next steps.

---

## 🚀 Implementation

### 1. Implement the Formatters Gate
Open `apps/api/src/agents/FormattersGate.ts`. This agent will act as a "security guard" for our parallel formatters.

```typescript
import { BaseAgent, createEvent, type InvocationContext } from "@google/adk";
import { formatters } from "./orchestrator.js"; // We'll move formatters here or export it

export default class FormattersGate extends BaseAgent {
    constructor() {
        super({ name: 'format_gate', subAgents: [formatters] });
    }

    protected async *runAsyncImpl(ctx: InvocationContext) {
        const judge = ctx.session.state['judge_output'] as { status?: string };
        const passed = (judge?.status || '').toLowerCase() === 'pass';

        if (!passed) {
            yield createEvent({
                author: this.name,
                content: { role: 'model', parts: [{ text: 'Skipping formatting because research did not pass the quality check.' }] },
            });
            return;
        }

        // Run the formatters if we passed the check
        for await (const ev of formatters.runAsync(ctx)) {
            yield ev;
        }
    }

    protected async *runLiveImpl(ctx: InvocationContext) {
        yield* this.runAsyncImpl(ctx);
    }
}
```

### 2. Update the Orchestrator
Open `apps/api/src/agents/orchestrator.ts`. We will update the `hypeSquadCreator` to use our new `FormattersGate`.

```typescript
import FormattersGate from './FormattersGate.js';

// ... (keep researchLoop and formatters)

export const hypeSquadCreator = new SequentialAgent({
    name: 'hype_squad',
    description: 'Researches a topic and generates viral social media content.',
    subAgents: [
        researchLoop, 
        new FormattersGate() // <--- Use the gate instead of formatters directly
    ],
});
```

---

## 🧪 Checkpoint: Test the Gate
You can test the gate by manually changing the "status" in your mock research data in `test-parallel.ts` to "fail".

### 📝 Action: Run the parallel test again
Run this command from `apps/api`:

```bash
npm run test:parallel
```

**What to watch for:**
- If the mock data in `test-parallel.ts` has `status: 'pass'`, it should work as before.
- If you change it to `status: 'fail'`, you should see the `format_gate` message and NO output from the LinkedIn or Twitter agents.

---

<div align="right">
  <a href="./07_PROGRESS.md"><b>Next: Step 7 - Progress Wrappers ➡️</b></a>
</div>
