# Step 4: Loop Orchestration (Quality Iteration)

<div align="center">
  <h3>
    <a href="./03_THE_JUDGE.md">⬅️ Back: The Judge</a> | 
    <b>Step 4: Loop Orchestration</b> | 
    <a href="./05_PARALLEL_FORMATTERS.md">Next: Parallel Formatters ➡️</a>
  </h3>
</div>

We have a **Researcher** and a **Judge**, but they are working in isolation. In the real world, if a researcher hands in a bad report, the judge sends it back with feedback. The researcher then tries again, incorporating that feedback.

In this step, you will build this **Feedback Loop** using the `LoopAgent` and a custom **Escalation Checker**.

---

## 🧠 Key Concepts: The `LoopAgent`

A `LoopAgent` is an orchestrator that runs its sub-agents in a circle, over and over again, until one of them signals that it's time to stop (or it hits a `maxIterations` limit).

### How do we stop the loop?
In `@google/adk`, we stop a loop using an **Escalation**. An agent can yield an event with `actions: { escalate: true }`. This signals to the parent (the LoopAgent) that we are done with this cycle and should exit.

> **TODO: Add a diagram showing the Researcher -> Judge -> Checker loop, where 'Fail' goes back to Researcher and 'Pass' escalates out.**

---

## 🛠️ The Escalation Checker

The Judge agent only *evaluates*—it doesn't have the power to stop the loop itself. We need a "referee" to look at the Judge's verdict and pull the lever to exit the loop.

We do this by creating a custom agent that extends `BaseAgent`. This is our first "Code-Based Agent" (it doesn't use an LLM).

---

## 🚀 Implementation

### 1. Implement the Escalation Checker
Open `apps/api/src/agents/EscalationChecker.ts` and implement the logic to check the judge's status.

```typescript
export default class EscalationChecker extends BaseAgent {
    protected async *runAsyncImpl(ctx: InvocationContext) {
        const lastOutput = ctx.session.state['judge_output'] as { status?: string };

        if (lastOutput?.status === 'pass') {
            // Signal the LoopAgent to exit!
            yield createEvent({
                author: this.name,
                content: { role: 'model', parts: [{ text: 'Research approved!' }] },
                actions: createEventActions({ escalate: true }),
            });
            return;
        }

        yield createEvent({
            author: this.name,
            content: { role: 'model', parts: [{ text: 'Research failed check. Retrying...' }] },
        });
    }
}
```

### 2. Assemble the Loop
Open `apps/api/src/agents/orchestrator.ts` and wire them together.

```typescript
export const researchLoop = new LoopAgent({
    name: 'research_loop',
    subAgents: [
        researcher,
        judge,
        new EscalationChecker({ name: 'checker' }),
    ],
    maxIterations: CONFIG.RESEARCH_LOOP_MAX,
});
```

---

## 🔍 Deep Dive: Feedback Persistence
How does the Researcher know *why* it failed?
1.  **The Judge** writes its feedback to `judge_output` in the shared **Session State**.
2.  **The Loop** starts over.
3.  **The Researcher**'s `instruction` function (which you wrote in Step 2) reads `judge_output` and adds it to the prompt!

This is the "memory" that allows the system to improve with each iteration.

---

## 🧪 Checkpoint: Test the Loop
Testing a loop is exciting because you can see the agents "talking" to each other!

### 📝 Action: Run the loop test
Run this command from `apps/api`:

```bash
npm run test:loop -- "Find the latest news on SpaceX Starship"
```

**What to watch for:**
- If the first research is "thin", you'll see the Judge fail it.
- You'll see the `checker` say "Retrying...".
- The Researcher will run again, and the Judge will evaluate the *new* result.
- Eventually, it should "Pass" and the test will finish.

---

<div align="right">
  <a href="./05_PARALLEL_FORMATTERS.md"><b>Next: Step 5 - Parallel Formatters ➡️</b></a>
</div>
