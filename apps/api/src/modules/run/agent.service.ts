import { 
    Runner, 
    InMemorySessionService as SessionService,
    stringifyContent, 
    getFunctionCalls, 
    getFunctionResponses,
    BaseAgent
} from '@google/adk';
import { injectable, inject } from 'tsyringe';
import { Logger } from '../../core/logger.js';

/**
 * Consistent Event interface for the UI.
 */
export interface StreamEvent {
    author: string;
    text: string;
    calls: string[];
    responses: string[];
    escalate: boolean;
    judge_output: string | null;
    researcher_output: string | null;
    twitter_output: string | null;
    linkedin_output: string | null;
    done: boolean;
    reqId: string | null;
}

@injectable()
export class AgentService {
    private runner: Runner;
    private readonly SUPPRESS_TEXT_FROM = new Set([
        'researcher', 
        'researcher_search', 
        'researcher_scrape', 
        'researcher_process', 
        'judge'
    ]);

    constructor(
        @inject('HypeSquadAgent') private agent: BaseAgent,
        @inject('SessionService') private sessionService: SessionService,
        @inject('AppName') private appName: string,
        @inject(Logger) private log: Logger
    ) {
        this.runner = new Runner({ 
            appName: this.appName, 
            agent: this.agent, 
            sessionService: this.sessionService 
        });
    }

    async *runStream(params: {
        userId: string;
        sessionId: string;
        query: string;
        maxLlmCalls?: number;
        reqId?: string;
    }): AsyncGenerator<StreamEvent> {
        const { userId, sessionId, query, maxLlmCalls, reqId } = params;
        const accumulator = new OutputAccumulator(this.log);
        const requestId = reqId ?? null;

        const runArgs = { 
            userId, 
            sessionId, 
            newMessage: { role: 'user', parts: [{ text: query }] },
            runConfig: maxLlmCalls ? { maxLlmCalls } : undefined
        };

        this.log.info('Starting agent stream', { userId, sessionId, requestId });

        try {
            for await (const rawEvent of this.runner.runAsync(runArgs as any)) {
                accumulator.update(rawEvent);
                if (this.shouldSuppress(rawEvent, accumulator.hasUpdate)) {
                    continue;
                }
                yield this.formatEvent(rawEvent, accumulator, requestId);
            }
            yield await this.getFinalEvent(userId, sessionId, accumulator, requestId);
        } catch (err) {
            this.log.error('Error during agent execution', { error: (err as Error).message, userId, sessionId });
            throw err;
        }
    }

    private shouldSuppress(event: any, isDeltaUpdate: boolean): boolean {
        const author = event.author ?? 'system';
        const isProgress = author.endsWith('_progress');
        const hasTools = getFunctionCalls(event).length > 0 || getFunctionResponses(event).length > 0;
        const isEscalation = Boolean(event.actions?.escalate);
        const isInternalAgent = this.SUPPRESS_TEXT_FROM.has(author);
        return isInternalAgent && !isProgress && !hasTools && !isEscalation && !isDeltaUpdate;
    }

    private formatEvent(event: any, acc: OutputAccumulator, reqId: string | null): StreamEvent {
        return {
            author: event.author ?? 'system',
            text: stringifyContent(event),
            calls: getFunctionCalls(event).map((c: any) => c.name),
            responses: getFunctionResponses(event).map((r: any) => r.name),
            escalate: Boolean(event.actions?.escalate),
            judge_output: acc.judge ?? null,
            researcher_output: acc.researcher ?? null,
            twitter_output: acc.twitter ?? null,
            linkedin_output: acc.linkedin ?? null,
            done: false,
            reqId
        };
    }

    private async getFinalEvent(userId: string, sessionId: string, acc: OutputAccumulator, reqId: string | null): Promise<StreamEvent> {
        await acc.syncWithSession(this.sessionService, this.appName, userId, sessionId);
        return {
            author: 'system',
            text: 'done',
            calls: [],
            responses: [],
            escalate: false,
            judge_output: acc.judge ?? null,
            researcher_output: acc.researcher ?? null,
            twitter_output: acc.twitter ?? null,
            linkedin_output: acc.linkedin ?? null,
            done: true,
            reqId
        };
    }
}

class OutputAccumulator {
    public judge: string | undefined;
    public researcher: string | undefined;
    public twitter: string | undefined;
    public linkedin: string | undefined;
    public hasUpdate: boolean = false;

    constructor(private log: Logger) {}

    update(event: any) {
        this.hasUpdate = false;
        const delta = event.actions?.stateDelta as Record<string, any> | undefined;
        if (!delta) return;

        if (delta.judge_output) { 
            const val = delta.judge_output;
            this.judge = (typeof val === 'object' && val !== null) ? (val.feedback || this.toString(val)) : this.toString(val); 
            this.hasUpdate = true; 
        }
        if (delta.researcher_output) { this.researcher = this.toString(delta.researcher_output); this.hasUpdate = true; }
        if (delta.twitter_output) { this.twitter = this.toString(delta.twitter_output); this.hasUpdate = true; }
        if (delta.linkedin_output) { this.linkedin = this.toString(delta.linkedin_output); this.hasUpdate = true; }

        if (this.hasUpdate) {
            this.log.debug('State delta detected and accumulated', {
                hasJudge: !!this.judge,
                hasResearcher: !!this.researcher,
                hasTwitter: !!this.twitter,
                hasLinkedin: !!this.linkedin
            });
        }
    }

    async syncWithSession(service: SessionService, appName: string, userId: string, sessionId: string) {
        if (this.judge && this.researcher && this.twitter && this.linkedin) return;
        try {
            const session = await service.getSession({ appName, userId, sessionId });
            const st = session?.state as Record<string, any> | undefined;
            if (!this.judge) {
                const val = st?.judge_output;
                this.judge = (typeof val === 'object' && val !== null) ? (val.feedback || this.toString(val)) : this.toString(val);
            }
            if (!this.researcher) this.researcher = this.toString(st?.researcher_output);
            if (!this.twitter) this.twitter = this.toString(st?.twitter_output);
            if (!this.linkedin) this.linkedin = this.toString(st?.linkedin_output);
        } catch (err) {
            this.log.warn('Failed to sync final session state', { error: (err as Error).message });
        }
    }

    private toString(val: any): string | undefined {
        if (val === null || val === undefined) return undefined;
        if (typeof val === 'string') return val;
        return stringifyContent(val);
    }
}
