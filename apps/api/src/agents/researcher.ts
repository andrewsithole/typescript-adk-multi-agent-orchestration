import { LlmAgent, GOOGLE_SEARCH } from '@google/adk';

export const researcher = new LlmAgent({
    name: 'researcher',
    model: 'gemini-2.5-flash',
    description: 'Gathers information using Google Search.',
    instruction: 'You are an expert researcher. Use the search tool to find facts.',
    outputKey: 'researcher_output',
    tools: [GOOGLE_SEARCH],
});

