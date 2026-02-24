import { LlmAgent, zodObjectToSchema } from '@google/adk';
import { z } from 'zod';

export const JudgeFeedbackSchema = z.object({
    status: z.enum(['pass', 'fail']),
    feedback: z.string(),
});

export const judge = new LlmAgent({
    name: 'judge',
    model: 'gemini-2.5-flash',
    description: 'Evaluates research findings.',
    instruction: 'Evaluate the research. Return "fail" if info is thin, "pass" if complete.',
    // Convert Zod schema to GenAI Schema required by ADK
    outputSchema: zodObjectToSchema(JudgeFeedbackSchema),
    outputKey: 'judge_output',
    // Agents with outputSchema should not transfer control
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
});
