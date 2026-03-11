import { LlmAgent, zodObjectToSchema, stringifyContent } from '@google/adk';
import { z } from 'zod';

export const JudgeFeedbackSchema = z.object({
    status: z.enum(['pass', 'fail']),
    feedback: z.string(),
});

export const judge = new LlmAgent({
    name: 'judge',
    model: 'gemini-2.5-flash',
    description: 'Evaluates research findings.',
    instruction: (ctx) => {
        const raw = ctx.invocationContext.session.state['researcher_output'];
        const research = raw ? stringifyContent(raw as any) : '(no research available)';
        console.log("Judge received research to evaluate:", research);
        return `Evaluate the following research. Return "fail" if the info is thin or incomplete, "pass" if it is thorough.\n\nResearch:\n${research}`;
    },
    // Convert Zod schema to GenAI Schema required by ADK
    outputSchema: zodObjectToSchema(JudgeFeedbackSchema),
    outputKey: 'judge_output',
    // Agents with outputSchema should not transfer control
    includeContents: 'none',
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
});

