import OpenAI from 'openai';
import { IAIProvider, IMessage, IChatResponse } from '../types';
import { AIConfig } from '../config';

export class OpenAIProvider implements IAIProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: AIConfig.getOpenAIKey()
        });
    }

    async chat(messages: IMessage[]): Promise<IChatResponse> {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4',
            messages: messages,
        });

        return {
            content: response.choices[0]?.message?.content || '',
            provider: 'openai'
        };
    }
}
