import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { AIConfig } from './config';
import { IMessage, IChatResponse, IAIProvider } from './types';

export class ChatService {
    private providers: Map<string, IAIProvider>;

    constructor() {
        this.providers = new Map();
        this.providers.set('openai', new OpenAIProvider());
        this.providers.set('anthropic', new AnthropicProvider());
    }

    async chat(messages: IMessage[]): Promise<IChatResponse> {
        const provider = AIConfig.getDefaultProvider();
        const aiProvider = this.providers.get(provider);
        
        if (!aiProvider) {
            throw new Error(`Provider ${provider} not found`);
        }

        if (!AIConfig.validateConfig()) {
            throw new Error('API key not configured');
        }

        return aiProvider.chat(messages);
    }
}
