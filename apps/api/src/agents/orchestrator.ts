import {
    SequentialAgent,
    LoopAgent,
    ParallelAgent,
} from '@google/adk';
import EscalationChecker from './EscalationChecker.js';
import { researcher } from './researcher.js';
import { judge } from './judge.js';
import { threadWhiz } from './threadWhiz.js';
import { theProfessional } from './theProfessional.js';
import ProgressWrapper from "./ProgressChecker.js";

// 1. Create the Research Loop (Researcher -> Judge -> Checker)
const researchLoop = new LoopAgent({
    name: 'research_loop',
    subAgents: [
        new ProgressWrapper(researcher, 'Starting research…', 'Research complete.', { name: 'researcher_progress' }),
        new ProgressWrapper(judge, 'Evaluating quality…', 'Evaluation done.', { name: 'judge_progress' }),
        new EscalationChecker({ name: 'checker' }),
    ],
    maxIterations: 3,
});

// 2. Create the Formatting Layer (Twitter & LinkedIn in parallel)
const formatters = new ParallelAgent({
    name: 'formatters',
    subAgents: [
        new ProgressWrapper(threadWhiz, 'Crafting Twitter thread…', 'Twitter thread ready.', { name: 'twitter_progress' }),
        new ProgressWrapper(theProfessional, 'Writing LinkedIn post…', 'LinkedIn post ready.', { name: 'linkedin_progress' }),
    ],
});

// 3. Create the Final Pipeline
export const hypeSquadCreator = new SequentialAgent({
    name: 'hype_squad',
    description: 'Researches a topic and generates viral social media content.',
    subAgents: [researchLoop, formatters],
});
