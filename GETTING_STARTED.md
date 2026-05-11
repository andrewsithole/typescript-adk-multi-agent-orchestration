# Codelab: Building a Multi-Agent System

<div align="center">
  <h3>
    <a href="./README.md">🏠 Home</a> | 
    <b>Step 0: Intro</b> | 
    <a href="#2-setup">Next Step ➡️</a>
  </h3>
</div>

<details>
<summary><b>📖 Click to see Codelab Sidebar (Step 0 of 10)</b></summary>

### 🛠 The Path to Hype Squad
1.  **[Introduction](#1-introduction)** (Current)
2.  **[Setup](#2-setup)**
3.  **[Step 1: The Researcher](./GETTING_STARTED.md)** (Coming soon)
4.  **[Step 2: The Judge](./GETTING_STARTED.md)** (Coming soon)
5.  **[Step 3: Loop Orchestration](./GETTING_STARTED.md)** (Coming soon)
6.  **[Step 4: Parallel Formatters](./GETTING_STARTED.md)** (Coming soon)
7.  **[Step 5: The Gatekeeper](./GETTING_STARTED.md)** (Coming soon)
8.  **[Step 6: Progress & Feedback](./GETTING_STARTED.md)** (Coming soon)
9.  **[Step 7: Final Assembly](./GETTING_STARTED.md)** (Coming soon)
10. **[Step 8: Refactoring for Production](./GETTING_STARTED.md)** (Coming soon)

---
</details>

## 1. Introduction
In the rapidly evolving landscape of Generative AI, moving from a single chatbot to a **multi-agent system** is the key to handling complex, multi-step tasks. While a single LLM call might struggle to both research a topic and write high-quality social media content in one go, a team of specialized agents can collaborate to ensure accuracy, quality, and style.

In this codelab, you will build the **"Hype Squad"**—a production-ready multi-agent system designed to turn raw research into viral social media content. 

### Meet the Team
To achieve "Hype Squad" status, you'll implement four distinct agent roles:
*   **The Researcher:** Armed with Google Search, this agent scours the web for the latest facts and data on your chosen topic.
*   **The Judge:** A critical evaluator that holds the Researcher to high standards. It reviews findings against a quality rubric and decides if the team is ready to move forward.
*   **The Professional:** A LinkedIn specialist who transforms dry facts into engaging, professional networking posts.
*   **The Thread Whiz:** A Twitter/X expert who excels at condensing complex information into punchy, high-engagement threads.

### What you’ll learn
*   **Agent Specialization:** How to define roles and tools using the `@google/adk` (Agent Development Kit).
*   **State Management:** How agents "talk" to each other by sharing and updating a persistent session state.
*   **Advanced Orchestration:** Implementing complex flows using **Sequential**, **Loop**, and **Parallel** patterns.
*   **Control Flow:** Using "Gate" agents to prevent low-quality output from reaching the final stage.
*   **Production Architecture:** Scaling your system with Dependency Injection and Feature-Based modules for long-term maintainability.

### What you’ll build
You will start with a skeleton project and gradually construct a complete backend API that:
1.  **Iteratively Researches:** Loops through research and evaluation until the quality threshold is met.
2.  **Parallelizes Content:** Simultaneously generates LinkedIn and Twitter content once the research is "Judge-approved."
3.  **Streams Feedback:** Provides real-time progress updates (e.g., "Starting research...", "Evaluating quality...") to the user via Server-Sent Events (SSE).
4.  **Multi-Model Ready:** Swap between **Gemini**, **GPT-4o**, and **Claude 3.5 Sonnet** by simply changing an environment variable.

### Prerequisites
*   Basic knowledge of **TypeScript** and **Node.js**.
*   A **Google Gemini API Key**.
*   Familiarity with Express.js (helpful but not required).

<div align="right">
  <a href="#2-setup"><b>Next: Step 1 - Setup ➡️</b></a>
</div>

---

## 2. Setup
*(Next step would be environment setup)*
