# Step 5: Parallel Formatters (Multi-Channel Output)

<div align="center">
  <h3>
    <a href="./04_THE_RESEARCH_LOOP.md">⬅️ Back: The Research Loop</a> | 
    <b>Step 5: Parallel Formatters</b> | 
    <a href="./06_GATEKEEPER.md">Next: Gatekeepers ➡️</a>
  </h3>
</div>

Research is great, but we want to *do* something with it. In this step, we will create two "Social Media" agents that turn our research into platform-specific content: one for **LinkedIn** and one for **Twitter/X**.

Since these agents don't depend on each other, we can run them at the same time using the `ParallelAgent`.

---

## 🧠 Key Concepts: The `ParallelAgent`

A `ParallelAgent` is an orchestrator that takes a list of sub-agents and runs them all concurrently. 

- **Efficiency:** Instead of waiting for the LinkedIn post to finish before starting the Twitter thread, both happen simultaneously.
- **Independence:** If one agent fails, it doesn't necessarily stop the others (though you can configure this behavior).
- **State Merging:** All agents read from the same shared state and write their results back to their respective `outputKey`s.

---

## 🛠️ The Formatter Agents

We need two agents. Both will read from `researcher_output` in the session state but have very different personas.

### 1. The Professional (LinkedIn)
This agent focuses on authority, strategic value, and "thought leadership."

### 2. Thread Whiz (Twitter/X)
This agent focuses on "hooks," brevity, and viral engagement.

---

## 🚀 Implementation

### 1. Implement the LinkedIn Formatter
Open `apps/api/src/agents/theProfessional.ts` and add the implementation. Note how we use `stringifyContent` to convert the research state into a string for the prompt.

```typescript
import { LlmAgent, stringifyContent } from '@google/adk';
import { CONFIG } from '../core/config.js';

export const theProfessional = new LlmAgent({
    name: 'the_professional',
    model: CONFIG.DEFAULT_MODEL,
    description: 'Creates authoritative LinkedIn posts from research.',
    instruction: (ctx) => {
        const raw = ctx.invocationContext.session.state['researcher_output'];
        const research = raw ? stringifyContent(raw as any) : '(no research available)';

        return `You are "The Professional", a top-tier thought leader. Your goal is to turn the following research into a high-value LinkedIn post.

Guidelines:
- Write a single post between 150–300 words.
- Open with a strong first line. Avoid "I'm excited to share..." or other filler.
- Use short paragraphs and occasional line breaks to make it scroll-friendly.
- Tone: Professional but human, authoritative, and insightful.

Research Material:
${research}`;
    },
    outputKey: 'linkedin_output',
});
```

### 2. Implement the Twitter Formatter
Open `apps/api/src/agents/threadWhiz.ts`. This agent has a much punchier instruction.

```typescript
import { LlmAgent, stringifyContent } from '@google/adk';
import { CONFIG } from '../core/config.js';

export const threadWhiz = new LlmAgent({
    name: 'thread_whiz',
    model: CONFIG.DEFAULT_MODEL,
    description: 'Creates punchy Twitter/X threads from research.',
    instruction: (ctx) => {
        const raw = ctx.invocationContext.session.state['researcher_output'];
        const research = raw ? stringifyContent(raw as any) : '(no research available)';

        return `You are "Thread-Whiz", a viral content creator. Your goal is to turn the following research into a high-engagement Twitter/X thread.

Guidelines:
- Write a thread of 5–8 numbered tweets.
- Keep EVERY tweet strictly under 280 characters.
- Start with a hooky first tweet (bold claim, intriguing question, or surprising stat).
- The tone should be punchy, conversational, and opinionated.

Research Material:
${research}`;
    },
    outputKey: 'twitter_output',
});
```

### 3. Assemble the Parallel Pipeline
Open `apps/api/src/agents/orchestrator.ts`. We will now define a `ParallelAgent` and add it to our main `hypeSquadCreator` pipeline.

```typescript
import { ParallelAgent } from '@google/adk';
import { theProfessional } from './theProfessional.js';
import { threadWhiz } from './threadWhiz.js';

// ... (keep researchLoop)

export const formatters = new ParallelAgent({
    name: 'formatters',
    subAgents: [theProfessional, threadWhiz],
});

export const hypeSquadCreator = new SequentialAgent({
    name: 'hype_squad',
    description: 'Researches a topic and generates viral social media content.',
    subAgents: [
        researchLoop, 
        formatters // <--- Add this!
    ],
});
```

---

## 🧪 Checkpoint: Test Parallel Execution
When running in parallel, you'll see messages from both agents overlapping in the console!

### 📝 Action: Run the parallel test
We've created a test script that mocks the research data so you can test the formatters instantly without running the full search loop.

Run this command from `apps/api`:

```bash
npm run test:parallel
```

**What to watch for:**
- You should see `the_professional` and `thread_whiz` start at almost the exact same time.
- Both agents will stream their output concurrently.
- The final session state will contain both `linkedin_output` and `twitter_output`.

---

<div align="right">
  <a href="./06_GATEKEEPER.md"><b>Next: Step 6 - Gatekeepers ➡️</b></a>
</div>
