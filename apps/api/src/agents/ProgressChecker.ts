import {
    BaseAgent,
    InvocationContext,
    createEvent,
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