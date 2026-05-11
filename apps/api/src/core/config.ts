/**
 * Central configuration for the API
 */
export const CONFIG = {
    APP_NAME: process.env.APP_NAME || 'ts-multi-agents',
    PORT: Number(process.env.PORT) || 3000,
    
    // Agent Configuration
    DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'gemini-3.1-flash-lite',
    RESEARCH_LOOP_MAX: Number(process.env.RESEARCH_LOOP_MAX) || 3,
    
    // API Keys
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    
    // Session & Security
    SESSION_TTL_MS: 30 * 60_000, // 30 minutes
    JSON_BODY_LIMIT: '32kb',
    
    // Rate Limiting
    RATE_LIMIT: {
        WINDOW_MS: 60_000, // 1 minute
        SESSIONS_LIST: 20,
        SESSION_DELETE: 20,
        SESSION_CREATE: 20,
        STREAM_RUN: 12,
        PROBE: 30,
    },
    MODELS: {
        GEMINI_2_0_FLASH: 'gemini-3.1-flash-lite',
        GPT_4O: 'gpt-4o',
        CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20240620',
    }
};
