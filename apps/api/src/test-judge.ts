import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { judge } from './agents/judge.js';
import { Runner, InMemorySessionService } from '@google/adk';

// Load environment variables (.env) from the root
dotenv.config({ path: '../../.env' });

async function main() {
    // Get parameters from CLI
    // Usage: npm run test:judge -- "Topic" "Mock Research content"
    const args = process.argv.slice(2);
    
    const topic = args[0] || 'Gemini 1.5 Pro features';
    const mockResearch = args[1] || 'Gemini 1.5 Pro has a 2M context window and is multimodal.';
    
    console.log(`🚀 Running Judge Test...`);
    console.log(`📌 Topic: "${topic}"`);
    console.log(`📝 Mock Research: "${mockResearch.slice(0, 50)}..."`);
    
    const sessionService = new InMemorySessionService();
    const runner = new Runner({
        agent: judge,
        sessionService,
        appName: 'test-app'
    });

    try {
        // 1. Create session with the mock research already in the state
        await sessionService.createSession({
            appName: 'test-app',
            userId: 'test-user',
            sessionId: 'test-session',
            state: {
                'researcher_output': mockResearch
            }
        });

        // 2. Run the judge
        // We pass the topic as the 'newMessage' so ctx.invocationContext.userContent is correct
        console.log('\n⚖️ Judge is evaluating...');
        
        let finalResult: any = null;
        for await (const event of runner.runAsync({
            userId: 'test-user',
            sessionId: 'test-session',
            newMessage: {
                role: 'user',
                parts: [{ text: topic }]
            }
        })) {
            const stateDelta = event.actions?.stateDelta as Record<string, any>;
            if (stateDelta?.judge_output) {
                finalResult = stateDelta.judge_output;
            }
        }

        if (finalResult) {
            console.log('\n✅ Judge Verdict:');
            console.log(JSON.stringify(finalResult, null, 2));
        } else {
            console.log('\n⚠️ No verdict produced. Check your agent implementation.');
        }

    } catch (error) {
        console.error('❌ Error running judge:', error);
        console.log('\n💡 Tip: Make sure you have implemented the judge agent and schema in src/agents/judge.ts.');
    }
}

main();
