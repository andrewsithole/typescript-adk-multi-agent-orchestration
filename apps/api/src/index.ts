import 'reflect-metadata';
import { container } from './core/container.js';
import { Server } from './server.js';

const server = container.resolve(Server);
server.listen();
