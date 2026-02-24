// index.ts
import 'dotenv/config';
import { Runner, InMemorySessionService, stringifyContent, getFunctionCalls, getFunctionResponses } from '@google/adk';
import { courseCreator } from '@local/core';

async function main() {
    const appName = 'ts-multi-agents';
    const userId = 'user-1';
    const sessionId = 'session-1';

    const sessionService = new InMemorySessionService();
    await sessionService.createSession({ appName, userId, sessionId });

    const runner = new Runner({ appName, agent: courseCreator, sessionService });

    console.log('--- Running pipeline ---');
    let lastText = '';
    let lastJudgePrinted = '';
    for await (const event of runner.runAsync({
        userId,
        sessionId,
        newMessage: { role: 'user', parts: [{ text: 'Create a course on the history of Coffee.' }] },
    })) {
        const text = stringifyContent(event);
        const author = event.author ?? 'system';
        let printed = false;
        const calls = getFunctionCalls(event);
        const responses = getFunctionResponses(event);

        // Log plain text content per stage
        if (text) {
            lastText = text;
            console.log(`- [${author}] ${text}`);
            printed = true;
        }

        // Log tool calls/responses concisely
        if (calls?.length) {
            for (const c of calls) console.log(`- [${author}] -> tool call: ${c.name}`);
            printed = true;
        }
        if (responses?.length) {
            for (const r of responses) console.log(`- [${author}] <- tool response: ${r.name}`);
            printed = true;
        }

        // Log escalation signal
        if (event.actions?.escalate) {
            console.log(`- [${author}] escalating to parent agent`);
            printed = true;
        }

        // If nothing printed and it's an agent event, still log the stage
        if (!printed && author !== 'user') {
            console.log(`- [${author}] (no text)`);
        }

        // Peek current judge output from session state after each event
        const session = await sessionService.getSession({ appName, userId, sessionId });
        const judgeOut = session?.state?.['judge_output'] as unknown;
        const judgeStr = judgeOut ? JSON.stringify(judgeOut) : '';
        if (judgeStr && judgeStr !== lastJudgePrinted) {
            console.log(`- [state] judge_output = ${judgeStr}`);
            lastJudgePrinted = judgeStr;
        }
    }

    console.log('--- Pipeline Result ---');
    console.log(lastText);
}

main();
