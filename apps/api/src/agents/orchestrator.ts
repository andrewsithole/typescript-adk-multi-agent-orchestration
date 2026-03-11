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
import ProgressWrapper from "./ProgressChecker.js";
import {formatter} from "./formatter.js";

// The "Escalation Checker" - Deterministic logic to break the loop

// 1. Create the Research Loop (Researcher -> Judge -> Checker)
const researchLoop = new LoopAgent({
    name: 'research_loop',
    subAgents: [
        new ProgressWrapper(researcher, 'Starting research…', 'Research complete.', { name: 'researcher_wrapper' }),
        new ProgressWrapper(judge, 'Evaluating quality…', 'Evaluation done.', { name: 'judge_wrapper' }),
        new EscalationChecker({ name: 'checker' }),
    ],
    maxIterations: 3,
});

// 2. Create the Final Pipeline
export const courseCreator = new SequentialAgent({
    name: 'course_creator_pipeline',
    description: 'Researches and builds a course.',
    subAgents: [researchLoop, formatter], // You would add a ContentBuilder agent here next
});

