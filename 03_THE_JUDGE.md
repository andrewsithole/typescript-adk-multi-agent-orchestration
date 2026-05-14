# Step 3: The Judge (Structured Output)

<div align="center">
  <h3>
    <a href="./02_THE_RESEARCHER.md">⬅️ Back: The Researcher</a> | 
    <b>Step 3: The Judge</b> | 
    <a href="./04_LOOP.md">Next: Loop Orchestration ➡️</a>
  </h3>
</div>

In the previous step, you built the **Researcher**, who finds information. But how do we know if that information is actually *good*? In professional workflows, we don't just take the first draft; we have a **Reviewer** or **Judge**.

In this step, you will build the **Judge Agent**. Its job is to critically evaluate the Researcher's work against a specific quality rubric.

---

## 🧠 Key Concepts: Structured Output

Until now, we've been dealing with "unstructured" text—the LLM just talks back to us. While this is great for humans, it's hard for code to handle. Does the LLM say "It's good" or "I think this passes" or "Ready"?

To build a reliable system, we need **Structured Output**. We want the LLM to return data that looks like a JSON object with fixed keys and types.

### Zod: The Gatekeeper of Data
We use a library called **Zod** to define what our "Perfect Output" looks like. In ADK, we can pass this Zod schema to the agent, and the framework ensures the LLM follows the rules.

> **TODO: Add a diagram showing an LLM outputting messy text vs. a "Structured Output" funnel that turns it into a clean JSON object.**

---

## 🛠️ The Quality Rubric

A Judge is only as good as its instructions. Instead of saying "Is this good?", we give it a **Rubric** with specific criteria:
1.  **Freshness:** Is the data recent?
2.  **Excitement:** Does it have "hook" potential?
3.  **Accuracy:** Is it factually sound?
4.  **Relevancy:** Is it on-topic?

By asking for numerical scores, we can implement objective **Pass/Fail** logic in our multi-agent system.

---

## 🚀 Implementation

Let's build the Judge. Open `apps/api/src/agents/judge.ts` and paste the following code.

### 📝 Action: Update `apps/api/src/agents/judge.ts`

```typescript
// 1. Define the schema of the Judge's feedback
export const JudgeFeedbackSchema = z.object({
    status: z.enum(['pass', 'fail']),
    scores: z.object({
        freshness: z.number().min(0).max(10),
        excitement: z.number().min(0).max(10),
        accuracy: z.number().min(0).max(10),
        relevancy: z.number().min(0).max(10),
    }),
    feedback: z.string(),
});

// 2. Define the Agent
export const judge = new LlmAgent({
    name: 'judge',
    model: CONFIG.DEFAULT_MODEL,
    description: 'Evaluates research findings for social media potential.',
    instruction: (ctx) => {
        // We pull the researcher's work from the session state!
        const raw = ctx.invocationContext.session.state['researcher_output'];
        const research = raw ? stringifyContent(raw as any) : 'NO RESEARCH DATA FOUND IN STATE.';
        
        // We also pull the user's original query to judge relevancy!
        const userQuery = stringifyContent({ content: ctx.invocationContext.userContent } as any);

        return `The user's original request was: "${userQuery}"

        Evaluate the following research for its potential to create high-quality social media content regarding this topic.
        
        Assign a score from 0 to 10 for: Freshness, Excitement, Accuracy, Relevancy.

        Pass/Fail Logic:
        - "pass" if average score >= 6 AND no single score < 4.
        - Otherwise "fail".

        Provide specific feedback on how to improve if it fails.

        Research to evaluate:
        ${research}`;
    },
    // This tells the LLM exactly what format to return
    outputSchema: zodObjectToSchema(JudgeFeedbackSchema),
    outputKey: 'judge_output',
});
```

---

## 🔍 Deep Dive: Why Structured Output?

1.  **Deterministic Logic:** You can write an `if (judge_output.status === 'pass')` statement in your code.
2.  **Validation:** If the LLM misses a field, Zod will catch it before the rest of your system breaks.
3.  **Clean State:** It keeps your `session.state` organized and easy to read.

---

## 🧪 Checkpoint: Test the Judge
We've provided a test script for the Judge as well. This time, the test script will "mock" some research and ask the Judge to evaluate it.

### 📝 Action: Run the test
Run the following command from `apps/api`:

```bash
npm run test:judge
```

**Try this:** Pass a custom **Topic** and some **Mock Research** to see how the Judge reacts.

```bash
npm run test:judge -- "Quantum Computing" "I found some info about a cat that likes pizza. It happened in 1995."
```

*(Note: The first argument is the Topic, the second is the Research Findings.)*

---

<div align="right">
  <a href="./04_THE_RESEARCH_LOOP.md"><b>Next: Step 4 - Loop Orchestration ➡️</b></a>
</div>
