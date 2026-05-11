# Using Alternative LLM Providers

While the Hype Squad is optimized for **Google Gemini**, it is built on the multi-model `@google/adk`, making it easy to swap in **OpenAI** or **Anthropic (Claude)** models.

## 1. OpenAI Setup

To use GPT-4o or other OpenAI models:

1.  **Get a Key:** Obtain an API key from the [OpenAI Dashboard](https://platform.openai.com/).
2.  **Update `.env`:** Add your key and set the default model:
    ```env
    OPENAI_API_KEY=sk-...
    DEFAULT_MODEL=gpt-5
    ```

## 2. Anthropic (Claude) Setup

To use Claude 3.5 Sonnet or other Anthropic models:

1.  **Get a Key:** Obtain an API key from the [Anthropic Console](https://console.anthropic.com/).
2.  **Update `.env`:** Add your key and set the default model:
    ```env
    ANTHROPIC_API_KEY=sk-ant-...
    DEFAULT_MODEL=claude-3-5-sonnet-20240620
    ```

## 3. Mixing Models

You can also configure specific agents to use different models. For example, to keep the Researcher on Gemini but use GPT-4o for the final writing:

Edit `apps/api/src/agents/theProfessional.ts`:

```typescript
import {OpenAILlm} from "./models";

export const theProfessional = new LlmAgent({
    name: 'the_professional',
    model: new OpenAILlm('gpt-5'), // Override the default
    // ...
});
```

> **Note:** Ensure you have the corresponding API key set in your `.env` file for any model you specify.
