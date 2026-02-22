import { describe, it, expect } from 'vitest';
import { SessionCreateBody, RunStreamQuery } from './schemas.js';

// helpers
const long = (n: number) => 'a'.repeat(n);

describe('SessionCreateBody', () => {
  it('accepts userId alone', () => {
    const result = SessionCreateBody.safeParse({ userId: 'user-1' });
    expect(result.success).toBe(true);
  });

  it('accepts userId + sessionId', () => {
    const result = SessionCreateBody.safeParse({ userId: 'user-1', sessionId: 'session-1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBe('session-1');
    }
  });

  it('rejects missing userId', () => {
    const result = SessionCreateBody.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty userId', () => {
    const result = SessionCreateBody.safeParse({ userId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects userId over 128 chars', () => {
    const result = SessionCreateBody.safeParse({ userId: long(129) });
    expect(result.success).toBe(false);
  });

  it('accepts userId exactly 128 chars', () => {
    const result = SessionCreateBody.safeParse({ userId: long(128) });
    expect(result.success).toBe(true);
  });

  it('rejects sessionId over 128 chars', () => {
    const result = SessionCreateBody.safeParse({ userId: 'user-1', sessionId: long(129) });
    expect(result.success).toBe(false);
  });
});

describe('RunStreamQuery', () => {
  const valid = { userId: 'user-1', sessionId: 'session-1', q: 'Create a course on Coffee.' };

  it('accepts a valid query', () => {
    const result = RunStreamQuery.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects missing userId', () => {
    const result = RunStreamQuery.safeParse({ ...valid, userId: undefined });
    expect(result.success).toBe(false);
  });

  it('rejects missing sessionId', () => {
    const result = RunStreamQuery.safeParse({ ...valid, sessionId: undefined });
    expect(result.success).toBe(false);
  });

  it('rejects missing q', () => {
    const result = RunStreamQuery.safeParse({ ...valid, q: undefined });
    expect(result.success).toBe(false);
  });

  it('rejects empty q', () => {
    const result = RunStreamQuery.safeParse({ ...valid, q: '' });
    expect(result.success).toBe(false);
  });

  it('accepts q exactly 2000 chars', () => {
    const result = RunStreamQuery.safeParse({ ...valid, q: long(2000) });
    expect(result.success).toBe(true);
  });

  it('rejects q over 2000 chars', () => {
    const result = RunStreamQuery.safeParse({ ...valid, q: long(2001) });
    expect(result.success).toBe(false);
  });

  it('rejects userId over 128 chars', () => {
    const result = RunStreamQuery.safeParse({ ...valid, userId: long(129) });
    expect(result.success).toBe(false);
  });

  it('rejects sessionId over 128 chars', () => {
    const result = RunStreamQuery.safeParse({ ...valid, sessionId: long(129) });
    expect(result.success).toBe(false);
  });
});
