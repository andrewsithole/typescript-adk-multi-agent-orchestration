import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { researcher } from './agents/researcher.js';
import { Runner, InMemorySessionService } from '@google/adk';

// Load environment variables (.env) from the root
dotenv.config({ path: '../../.env' });

async function main() {
    // Get query from command line arguments (joining multi-word prompts), or use a default
    const args = process.argv.slice(2);
    const query = args.length > 0 ? args.join(' ') : 'What are the top 3 features of Gemini 1.5 Pro?';
    
    console.log(`🚀 Running Researcher Test with query: "${query}"...`);
    
    const sessionService = new InMemorySessionService();
    const runner = new Runner({
        agent: researcher,
        sessionService,
        appName: 'test-app'
    });

    try {
        // We must create the session first before the runner can use it
        await sessionService.createSession({
            appName: 'test-app',
            userId: 'test-user',
            sessionId: 'test-session'
        });

        // Runner.runAsync returns an AsyncGenerator of events
        // We iterate through it to get the final result
        let finalResult = '';
        
        for await (const event of runner.runAsync({
            userId: 'test-user',
            sessionId: 'test-session',
            newMessage: {
                role: 'user',
                parts: [{ text: query }]
            }
        })) {
            // researcher_output is saved in the session state delta
            const stateDelta = event.actions?.stateDelta as Record<string, any>;
            if (stateDelta?.researcher_output) {
                finalResult = stateDelta.researcher_output;
            }
        }

        if (finalResult) {
            console.log('\n✅ Research Findings:\n');
            console.log(finalResult);
        } else {
            console.log('\n⚠️ No research findings were produced. Check your agent implementation.');
        }

    } catch (error) {
        console.error('❌ Error running researcher:', error);
        console.log('\n💡 Tip: Make sure you have implemented the researcher agent in src/agents/researcher.ts and added your GEMINI_API_KEY to the .env file.');
    }
}

main();
