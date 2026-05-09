import {
    SequentialAgent,
    LoopAgent,
} from '@google/adk';
import EscalationChecker from './EscalationChecker.js';
import { researcher } from './researcher.js';
import { judge } from './judge.js';
import ProgressWrapper from "./ProgressChecker.js";
import FormattersGate from "./FormattersGate.js";
import { CONFIG } from '../core/config.js';

// 1. Create the Research Loop (Researcher -> Judge -> Checker)
const researchLoop = new LoopAgent({
    name: 'research_loop',
    subAgents: [
        new ProgressWrapper(researcher, 'Starting research…', 'Research complete.', { name: 'researcher_progress' }),
        new ProgressWrapper(judge, 'Evaluating quality…', 'Evaluation done.', { name: 'judge_progress' }),
        new EscalationChecker({ name: 'checker' }),
    ],
    maxIterations: CONFIG.RESEARCH_LOOP_MAX,
});


// 3. Create the Final Pipeline
export const hypeSquadCreator = new SequentialAgent({
    name: 'hype_squad',
    description: 'Researches a topic and generates viral social media content.',
    subAgents: [researchLoop, new FormattersGate()],
});
