import { z } from 'zod';

const id = z.string().min(1).max(128);

export const SessionCreateBody = z.object({
  userId: id,
  sessionId: id.optional(),
});

export const RunStreamQuery = z.object({
  userId: id,
  sessionId: id,
  q: z.string().min(1).max(2000),
  model: z.string().optional(),
  maxIterations: z.coerce.number().optional(),
});

export type SessionCreateBodyInput = z.infer<typeof SessionCreateBody>;
export type RunStreamQueryInput = z.infer<typeof RunStreamQuery>;
