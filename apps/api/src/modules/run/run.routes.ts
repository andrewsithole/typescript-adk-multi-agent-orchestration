import { Router } from 'express';
import { container } from '../../core/container.js';
import { RunController } from './run.controller.js';
import { rateLimit } from '../../common/middleware/rateLimiter.js';
import { CONFIG } from '../../core/config.js';
import 'express-async-errors';

const router = Router();
const controller = container.resolve(RunController);

router.get('/stream', rateLimit(CONFIG.RATE_LIMIT.STREAM_RUN), (req, res) => controller.stream(req, res));
router.get('/probe', rateLimit(CONFIG.RATE_LIMIT.PROBE), (req, res) => controller.probe(req, res));

export default router;
