import { container } from 'tsyringe';
import { InMemorySessionService } from '@google/adk';
import { Logger } from './logger.js';
import { CONFIG } from './config.js';
import { hypeSquadCreator } from '../agents/orchestrator.js';

// Register SessionService as a singleton
container.register('SessionService', {
    useValue: new InMemorySessionService()
});

container.register('AppName', {
    useValue: CONFIG.APP_NAME
});

container.register('HypeSquadAgent', {
    useValue: hypeSquadCreator
});

export { container };
