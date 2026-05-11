import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from repo root immediately
dotenv.config({ path: path.resolve(process.cwd(), '../../.env'), override: false });

import { registerMultiModelSupport } from './core/models.js';
import { container } from './core/container.js';
import { Server } from './server.js';

// Initialize custom LLM adapters (OpenAI, Anthropic)
registerMultiModelSupport();

const server = container.resolve(Server);
server.listen();
