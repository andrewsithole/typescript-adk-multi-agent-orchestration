import { LlmAgent, zodObjectToSchema, stringifyContent } from '@google/adk';
import { z } from 'zod';
import { createLogger } from '../core/logger.js';
import { CONFIG } from '../core/config.js';

const log = createLogger('judge');

/**
 * Judge Agent
 *
 * TODO: Paste the JudgeFeedbackSchema and Judge LlmAgent definition here.
 * Follow the instructions in the 03_THE_JUDGE.md tutorial.
 *
 * Hint: To accurately evaluate 'Relevancy', your instruction logic should
 * use both the 'researcher_output' from the session state and the
 * 'userContent' from the invocation context.
 */
