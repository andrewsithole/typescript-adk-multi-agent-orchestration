import { Router } from 'express';
import { container } from '../../core/container.js';
import { SessionController } from './session.controller.js';
import { rateLimit } from '../../common/middleware/rateLimiter.js';
import { CONFIG } from '../../core/config.js';
import 'express-async-errors';

const router = Router();
const controller = container.resolve(SessionController);

router.get('/:userId', rateLimit(CONFIG.RATE_LIMIT.SESSIONS_LIST), (req, res) => controller.listSessions(req, res));
router.delete('/:userId/:sessionId', rateLimit(CONFIG.RATE_LIMIT.SESSION_DELETE), (req, res) => controller.deleteSession(req, res));
router.post('/', rateLimit(CONFIG.RATE_LIMIT.SESSION_CREATE), (req, res) => controller.createSession(req, res));

export default router;
