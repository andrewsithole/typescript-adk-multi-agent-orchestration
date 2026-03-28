import {
    BaseAgent,
    InvocationContext,
    createEvent,
    getFunctionCalls,
    getFunctionResponses,
} from '@google/adk';

export default class ProgressWrapper extends BaseAgent {
    constructor(
        private inner: BaseAgent,
        private startMsg: string,
        private doneMsg: string,
        opts: { name: string }
    ) {
        super({ ...opts, subAgents: [inner] })
    }

    protected async *runAsyncImpl(ctx: InvocationContext) {
        yield createEvent({
            author: this.name,
            content: { role: 'model', parts: [{ text: this.startMsg }] },
        })

        for await (const event of this.inner.runAsync(ctx)) {
            const parts = event.content?.parts ?? [];
            const textSnippet = parts.map((p: any) => p.text ?? '').join('').slice(0, 120);
            console.log(`[DEBUG:${this.name}] event received`, {
                author: event.author,
                partial: event.partial ?? false,
                functionCalls: getFunctionCalls(event).map((c: any) => c.name),
                functionResponses: getFunctionResponses(event).map((r: any) => r.name),
                stateDeltaKeys: Object.keys(event.actions?.stateDelta ?? {}),
                hasContent: !!event.content,
                partCount: parts.length,
                textSnippet,
                errorCode: (event as any).errorCode,
                errorMessage: (event as any).errorMessage,
            });
            yield event;
        }

        console.log(`[${this.name}] session state after inner run:`, JSON.stringify(ctx.session.state, null, 2));

        yield createEvent({
            author: this.name,
            content: { role: 'model', parts: [{ text: this.doneMsg }] },
        })
    }

    protected async *runLiveImpl(ctx: InvocationContext) {
        yield* this.runAsyncImpl(ctx)
    }
}