import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { theProfessional } from './agents/theProfessional.js';
import { threadWhiz } from './agents/threadWhiz.js';
import { ParallelAgent, Runner, InMemorySessionService } from '@google/adk';

// Load environment variables (.env) from the root
dotenv.config({ path: '../../.env' });

async function main() {
    console.log(`🚀 Running Parallel Formatters Test...`);

    const formatters = new ParallelAgent({
        name: 'formatters_test',
        subAgents: [theProfessional, threadWhiz],
    });
    
    const sessionService = new InMemorySessionService();
    const runner = new Runner({
        agent: formatters,
        sessionService,
        appName: 'test-app'
    });

    try {
        // Create session with mock research data already in the state
        await sessionService.createSession({
            appName: 'test-app',
            userId: 'test-user',
            sessionId: 'test-session',
            state: {
                researcher_output: {
                    role: 'model',
                    parts: [{ text: 'Research data: SpaceX Starship is a fully reusable launch vehicle being developed by SpaceX. It is designed to carry both crew and cargo to Earth orbit, the Moon, Mars, and beyond.' }]
                },
                judge_output: {
                    status: 'pass'
                }
            }
        });

        console.log('🔄 Running formatters in parallel...');
        
        for await (const event of runner.runAsync({
            userId: 'test-user',
            sessionId: 'test-session',
            newMessage: {
                role: 'user',
                parts: [{ text: 'Summarize SpaceX Starship' }]
            }
        })) {
            const author = event.author;
            const text = event.content?.parts?.map((p: any) => p.text).join('') || '';
            
            if (text) {
                console.log(`\n[${author}] ${text.slice(0, 150)}...`);
            }
        }

        const session = await sessionService.getSession({ appName: 'test-app', userId: 'test-user', sessionId: 'test-session' });
        console.log('\n✅ Final Result in State:');
        console.log('LinkedIn Output:', !!session?.state['linkedin_output']);
        console.log('Twitter Output:', !!session?.state['twitter_output']);

    } catch (error) {
        console.error('❌ Error running parallel test:', error);
    }
}

main();
