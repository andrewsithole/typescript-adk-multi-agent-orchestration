import { 
    BaseLlm, 
    LLMRegistry,
    type LlmRequest, 
    type LlmResponse, 
    type BaseLlmConnection
} from '@google/adk';
import type {Content, Part} from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('models');

/**
 * Adapter for OpenAI models
 */
export class OpenAILlm extends BaseLlm {
    static override readonly supportedModels = [/^gpt-/, /^o1-/];
    private client: OpenAI;

    constructor({ model }: { model: string }) {
        super({ model });
        this.client = new OpenAI({
            apiKey: CONFIG.OPENAI_API_KEY,
        });
    }

    async *generateContentAsync(llmRequest: LlmRequest, stream?: boolean): AsyncGenerator<LlmResponse, void> {
        log.info('Generating content with OpenAI', { model: this.model, stream });

        const messages = this.mapContentsToMessages(llmRequest.contents);
        
        try {
            if (stream) {
                const responseStream = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                    stream: true,
                });

                for await (const chunk of responseStream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    if (text) {
                        yield {
                            content: { role: 'model', parts: [{ text }] },
                            partial: true,
                        };
                    }
                }
                yield { turnComplete: true };
            } else {
                const response = await this.client.chat.completions.create({
                    model: this.model,
                    messages,
                });

                yield {
                    content: { 
                        role: 'model', 
                        parts: [{ text: response.choices[0]?.message?.content || '' }] 
                    },
                    turnComplete: true,
                };
            }
        } catch (error: any) {
            log.error('OpenAI generation error', error);
            yield {
                errorCode: error.status?.toString() || '500',
                errorMessage: error.message,
            };
        }
    }

    async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
        throw new Error('Real-time connection not implemented for OpenAI adapter.');
    }

    private mapContentsToMessages(contents: Content[]): any[] {
        return contents.map(c => ({
            role: c.role === 'model' ? 'assistant' : 'user',
            content: c.parts?.map((p: Part)=> p.text).join('\n'),
        }));
    }
}

/**
 * Adapter for Anthropic models
 */
export class AnthropicLlm extends BaseLlm {
    static override readonly supportedModels = [/^claude-/];
    private client: Anthropic;

    constructor({ model }: { model: string }) {
        super({ model });
        this.client = new Anthropic({
            apiKey: CONFIG.ANTHROPIC_API_KEY,
        });
    }

    async *generateContentAsync(llmRequest: LlmRequest, stream?: boolean): AsyncGenerator<LlmResponse, void> {
        log.info('Generating content with Anthropic', { model: this.model, stream });

        const messages = this.mapContentsToMessages(llmRequest.contents);
        const system = this.extractSystemInstruction(llmRequest) ?? '';

        try {
            if (stream) {
                const responseStream = await this.client.messages.create({
                    model: this.model,
                    max_tokens: 4096,
                    messages,
                    system,
                    stream: true,
                });

                for await (const event of responseStream) {
                    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                        yield {
                            content: { role: 'model', parts: [{ text: event.delta.text }] },
                            partial: true,
                        };
                    }
                }
                yield { turnComplete: true };
            } else {
                const response = await this.client.messages.create({
                    model: this.model,
                    max_tokens: 4096,
                    messages,
                    system,
                });

                const text = response.content
                    .filter(c => c.type === 'text')
                    .map(c => (c as any).text)
                    .join('\n');

                yield {
                    content: { role: 'model', parts: [{ text }] },
                    turnComplete: true,
                };
            }
        } catch (error: any) {
            log.error('Anthropic generation error', error);
            yield {
                errorCode: error.status?.toString() || '500',
                errorMessage: error.message,
            };
        }
    }

    async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
        throw new Error('Real-time connection not implemented for Anthropic adapter.');
    }

    private mapContentsToMessages(contents: Content[]): any[] {
        // Filter out system instructions if they are in contents
        return contents
            .filter(c => c.role !== 'system')
            .map(c => ({
                role: c.role === 'model' ? 'assistant' : 'user',
                content: c.parts?.map(p => p.text).join('\n'),
            }));
    }

    private extractSystemInstruction(llmRequest: LlmRequest): string | undefined {
        // ADK often puts system instruction in config or as a special content
        const systemContent = llmRequest.contents.find(c => c.role === 'system');
        if (systemContent) {
            return systemContent.parts?.map(p => p.text).join('\n');
        }
        return (llmRequest.config as any)?.systemInstruction?.parts?.map((p: any) => p.text).join('\n');
    }
}

/**
 * Register the new models with ADK
 */
export function registerMultiModelSupport() {
    log.info('Registering OpenAI and Anthropic models with ADK LLMRegistry');
    LLMRegistry.register(OpenAILlm);
    LLMRegistry.register(AnthropicLlm);
}
