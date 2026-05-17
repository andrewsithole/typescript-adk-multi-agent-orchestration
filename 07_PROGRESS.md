# Step 7: Progress Wrappers (Polishing the UI)

<div align="center">
  <h3>
    <a href="./06_GATEKEEPER.md">⬅️ Back: Gatekeepers</a> | 
    <b>Step 7: Progress Wrappers</b> | 
    <a href="./08_ASSEMBLY.md">Next: Final Assembly ➡️</a>
  </h3>
</div>

When running complex agent workflows, users can get anxious if they see a blank screen for 30 seconds while an LLM is thinking. In this step, we will implement a **Progress Wrapper** that injects "Starting..." and "Done!" messages into the event stream.

The best part? We do this without changing a single line of logic in our core agents. This is a classic example of the **Decorator Pattern**.

---

## 🧠 Key Concepts: Agent Wrappers

An **Agent Wrapper** is a class that extends `BaseAgent` and "wraps" another agent, intercepting its events.

Think of it as a **Middleman**:
1.  **Before:** The middleman announces "I'm starting!"
2.  **During:** The middleman passes through everything the inner agent says.
3.  **After:** The middleman announces "I'm finished!"

This is perfect for adding logging, progress messages, or even error handling to *any* agent in your system.

---

## 🚀 Implementation

### 1. Implement the Progress Wrapper
Open `apps/api/src/agents/ProgressChecker.ts`. We'll implement a reusable `ProgressWrapper` class.

```typescript
import { BaseAgent, createEvent, type InvocationContext } from '@google/adk';

export default class ProgressWrapper extends BaseAgent {
    constructor(
        private inner: BaseAgent,
        private startMsg: string,
        private doneMsg: string,
        opts: { name: string }
    ) {
        super({ ...opts, subAgents: [inner] });
    }

    protected async *runAsyncImpl(ctx: InvocationContext) {
        // 1. Signal start to the UI
        yield createEvent({
            author: this.name,
            content: { role: 'model', parts: [{ text: this.startMsg }] },
        });

        // 2. Delegate to the inner agent and pass through all events
        for await (const event of this.inner.runAsync(ctx)) {
            yield event;
        }

        // 3. Signal completion
        yield createEvent({
            author: this.name,
            content: { role: 'model', parts: [{ text: this.doneMsg }] },
        });
    }

    protected async *runLiveImpl(ctx: InvocationContext) {
        yield* this.runAsyncImpl(ctx);
    }
}
```

### 2. Apply the Wrapper to the Formatters
Open `apps/api/src/agents/FormattersGate.ts`. We will now wrap our `threadWhiz` and `theProfessional` agents.

```typescript
import ProgressWrapper from './ProgressChecker.js';

const formatters = new ParallelAgent({
    name: 'formatters_internal',
    subAgents: [
        new ProgressWrapper(
            threadWhiz, 
            'Crafting Twitter thread...', 
            'Twitter thread ready.', 
            { name: 'twitter_progress' }
        ),
        new ProgressWrapper(
            theProfessional, 
            'Writing LinkedIn post...', 
            'LinkedIn post ready.', 
            { name: 'linkedin_progress' }
        ),
    ],
});
```

---

## 🧪 Checkpoint: Watch the Progress
Run your parallel test again. You should see the "Crafting..." messages appearing before the LLM output.

```bash
npm run test:parallel
```

---

<div align="right">
  <a href="./08_ASSEMBLY.md"><b>Next: Step 8 - Final Assembly ➡️</b></a>
</div>
