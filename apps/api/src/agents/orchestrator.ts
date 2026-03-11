import {
    SequentialAgent,
    LoopAgent,
    BaseAgent,
    InvocationContext,
    createEvent,
    createEventActions,
} from '@google/adk';
import EscalationChecker from './EscalationChecker.js';
import { researcher } from './researcher.js';
import { judge } from './judge.js';

// The "Escalation Checker" - Deterministic logic to break the loop

// 1. Create the Research Loop (Researcher -> Judge -> Checker)
const researchLoop = new LoopAgent({
    name: 'research_loop',
    subAgents: [researcher, judge, new EscalationChecker({ name: 'checker' })],
    maxIterations: 3,
});

// 2. Create the Final Pipeline
export const courseCreator = new SequentialAgent({
    name: 'course_creator_pipeline',
    description: 'Researches and builds a course.',
    subAgents: [researchLoop], // You would add a ContentBuilder agent here next
});

