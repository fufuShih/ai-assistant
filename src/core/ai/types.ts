export interface IMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface IChatResponse {
  content: string;
  provider: string;
}

export interface IAIProvider {
  chat(messages: IMessage[]): Promise<IChatResponse>;
}
