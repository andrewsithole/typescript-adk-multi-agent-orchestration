# Step 8: Final Assembly (The Master Pipeline)

<div align="center">
  <h3>
    <a href="./07_PROGRESS.md">⬅️ Back: Progress Wrappers</a> | 
    <b>Step 8: Final Assembly</b> | 
    <a href="./09_REFACTOR.md">Next: Refactoring ➡️</a>
  </h3>
</div>

We've built all the individual pieces: the **Researcher**, the **Judge**, the **Loop**, the **Parallel Formatters**, and the **Gatekeeper**. Now it's time to put them all together into a single, cohesive "Master Pipeline."

---

## 🧠 Key Concepts: Composition

The beauty of the ADK framework is that agents are **composable**. Because every agent (including orchestrators like `LoopAgent` and `ParallelAgent`) implements the same `BaseAgent` interface, you can nest them as deeply as your logic requires.

Our final `hypeSquadCreator` is a simple `SequentialAgent` that orchestrates two complex sub-trees:
1.  **The Research Loop:** A `LoopAgent` that handles searching, judging, and retrying.
2.  **The Formatting Gate:** A custom agent that handles conditional logic and parallel content generation.

---

## 🚀 Implementation

### 1. Finalize the Orchestrator
Open `apps/api/src/agents/orchestrator.ts`. This file is the "brain" of your application. Ensure the `hypeSquadCreator` is correctly wired to include the loop and the gate.

```typescript
import { SequentialAgent } from '@google/adk';
import { researchLoop } from './orchestrator.js'; // (already here)
import FormattersGate from './FormattersGate.js';

/**
 * The Master Pipeline
 * 1. Run the research loop (Research -> Judge -> Repeat?)
 * 2. Run the formatters gate (Check Judge -> Parallel LinkedIn/Twitter)
 */
export const hypeSquadCreator = new SequentialAgent({
    name: 'hype_squad',
    description: 'Researches a topic and generates viral social media content.',
    subAgents: [
        researchLoop, 
        new FormattersGate()
    ],
});
```

---

## 🧪 The Grand Finale: Run the Full System
It's time to see the "Hype Squad" in action from start to finish!

### 📝 Action: Start the API and Web Client
In one terminal (from `apps/api`):
```bash
npm run dev
```

In another terminal (from `apps/web`):
```bash
npm run dev
```

### 📝 Action: Test the Workflow
1.  Open your browser to `http://localhost:5173`.
2.  Enter a topic (e.g., "The future of solid-state batteries").
3.  Click "Go" and watch the **Activity Log**:
    - You'll see the **Researcher** calling Google Search.
    - You'll see the **Judge** providing structured feedback.
    - If the judge isn't happy, you'll see a second iteration!
    - Once approved, you'll see the **Twitter** and **LinkedIn** progress messages.
    - Finally, the formatted posts will appear in the output panels.

---

## 🎉 Congratulations!
You have built a fully functional, production-grade Multi-Agent System. You've mastered:
- **Specialized Roles:** Giving agents distinct identities and tools.
- **Loops & Escalations:** Implementing quality-control cycles.
- **Parallelism:** Running tasks concurrently for speed.
- **State Management:** Using a shared session state for agent communication.

---

<div align="right">
  <a href="./09_REFACTOR.md"><b>Next: Step 9 - Refactoring for Production ➡️</b></a>
</div>
