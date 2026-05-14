import {
    SequentialAgent,
    LoopAgent,
} from '@google/adk';
import EscalationChecker from './EscalationChecker.js';
import { researcher } from './researcher.js';
import { judge } from './judge.js';
import { CONFIG } from '../core/config.js';

/**
 * TODO: Step 4 - Implement the Research Loop
 * 
 * The Research Loop should:
 * 1. Run the Researcher agent.
 * 2. Run the Judge agent.
 * 3. Run the EscalationChecker to decide whether to loop again or finish.
 */
export const researchLoop = new LoopAgent({
    name: 'research_loop',
    subAgents: [
        researcher,
        judge,
        new EscalationChecker({ name: 'checker' }),
    ],
    maxIterations: CONFIG.RESEARCH_LOOP_MAX,
});

/**
 * Final Pipeline (We will add formatters in Step 5 & 6)
 */
export const hypeSquadCreator = new SequentialAgent({
    name: 'hype_squad',
    description: 'Researches a topic and generates viral social media content.',
    subAgents: [researchLoop], // For now, we only run the loop
});
