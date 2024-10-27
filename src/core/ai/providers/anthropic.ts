import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider, IMessage, IChatResponse } from '../types';
import { AIConfig } from '../config';

export class AnthropicProvider implements IAIProvider {
  private client: Anthropic;

  constructor() {
      this.client = new Anthropic({
          apiKey: AIConfig.getAnthropicKey()
      });
  }

  async chat(messages: IMessage[]): Promise<IChatResponse> {
      // Convert messages to Anthropic format, filtering out system messages
      const anthropicMessages = messages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
          }));

      // Add system message as a separate parameter if it exists
      const systemMessage = messages.find(msg => msg.role === 'system')?.content;

      const response = await this.client.messages.create({
          model: 'claude-3-opus-20240229',
          messages: anthropicMessages,
          system: systemMessage,
          max_tokens: 1024
      });

      // Handle response content safely
      let responseContent = '';
      if (response.content && response.content.length > 0) {
          const firstBlock = response.content[0];
          if ('text' in firstBlock) {
              responseContent = firstBlock.text;
          }
      }

      return {
          content: responseContent,
          provider: 'anthropic'
      };
  }
}
