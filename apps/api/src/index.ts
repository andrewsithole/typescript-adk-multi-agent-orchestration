import 'reflect-metadata';
import { registerMultiModelSupport } from './core/models.js';
import { container } from './core/container.js';
import { Server } from './server.js';

// Initialize custom LLM adapters (OpenAI, Anthropic)
registerMultiModelSupport();

const server = container.resolve(Server);
server.listen();
