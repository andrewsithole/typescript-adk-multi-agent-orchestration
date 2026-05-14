import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { researchLoop } from './agents/orchestrator.js';
import { Runner, InMemorySessionService } from '@google/adk';

// Load environment variables (.env) from the root
dotenv.config({ path: '../../.env' });

async function main() {
    const args = process.argv.slice(2);
    const query = args.length > 0 ? args.join(' ') : 'What is the current status of the Open Source AI definition?';
    
    console.log(`🚀 Running Research Loop Test with query: "${query}"...`);
    
    const sessionService = new InMemorySessionService();
    const runner = new Runner({
        agent: researchLoop,
        sessionService,
        appName: 'test-app'
    });

    try {
        await sessionService.createSession({
            appName: 'test-app',
            userId: 'test-user',
            sessionId: 'test-session'
        });

        console.log('🔄 Iterating through research and judgment...');
        
        let iteration = 1;
        for await (const event of runner.runAsync({
            userId: 'test-user',
            sessionId: 'test-session',
            newMessage: {
                role: 'user',
                parts: [{ text: query }]
            }
        })) {
            const author = event.author;
            const text = event.content?.parts?.map((p: any) => p.text).join('') || '';
            
            if (text) {
                console.log(`\n[${author}] ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}`);
            }

            if (event.actions?.escalate) {
                console.log('\n🏁 Loop Escalated (Finished)!');
            }
        }

        const session = await sessionService.getSession({ appName: 'test-app', userId: 'test-user', sessionId: 'test-session' });
        console.log('\n✅ Final Result in State:');
        console.log(JSON.stringify(session?.state['judge_output'], null, 2));

    } catch (error) {
        console.error('❌ Error running research loop:', error);
    }
}

main();
