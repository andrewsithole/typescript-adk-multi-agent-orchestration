# Step 1: Setup

<div align="center">
  <h3>
    <a href="./GETTING_STARTED.md">⬅️ Back: Intro</a> | 
    <b>Step 1: Setup</b> | 
    <a href="./02_THE_RESEARCHER.md">Next: The Researcher ➡️</a>
  </h3>
</div>

To build the Hype Squad, you'll need a solid foundation. Follow these steps to prepare your development environment.

### 1. Clone the Starter Project
We've prepared a skeleton repository with the frontend and API structure already in place so you can focus on the agents.

```bash
git clone https://github.com/google/ts-multi-agents.git
cd ts-multi-agents
```

### 2. Install Dependencies
This project uses a monorepo structure. You can install all dependencies for both the API and the Web client from the root.

```bash
npm install
```

### 3. Configure your API Key
The system is powered by Google's Gemini models. You'll need an API key from Google AI Studio.

1.  Go to [aistudio.google.com](https://aistudio.google.com/). 
    > **Note:** Signing in for the first time automatically sets up your Google AI Studio workspace. This process also creates a default Google Cloud project and a usable API key for you behind the scenes.
2.  Click **"Get API key"** and copy your existing key (or create a new one).
3.  In the root of your project, create a `.env` file:
    ```bash
    cp .env.example .env
    ```
4.  Open `.env` and paste your key:
    ```env
    GEMINI_API_KEY=your_key_here
    ```

> 💡 **Pro-Tip:** If you are using a brand new Google account or API key, you might occasionally see a "Quota Limit" or "Invalid Key" error for the first few minutes. This is usually just a propagation delay in Google's systems. If this happens, wait 2–5 minutes and try again.

> 💡 **Using OpenAI or Claude?** If you prefer to use other models like GPT-4o or Claude 3.5 Sonnet, see our [Alternative Models Setup Guide](./MODELS_SETUP.md).

### 4. Project Structure
Take a moment to explore the `apps/api/src` directory. This is where the magic happens:
- **`/agents`**: This will house our specialized agents (Researcher, Judge, etc.).
- **`/core`**: Configuration, logging, and dependency injection setup.
- **`/modules`**: The Express API logic, split into feature-based modules like `run` and `session`.

### 5. Port Availability
Before starting, ensure that ports **3000** (API) and **5173** (Web) are free. If you have other projects running on these ports, you may see an `EADDRINUSE` error.

- **To check ports:** `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows).
- **To change ports:** You can update the `PORT` variable in your `.env` file for the API.

---

<div align="right">
  <a href="./02_THE_RESEARCHER.md"><b>Next: Step 2 - The Researcher ➡️</b></a>
</div>
