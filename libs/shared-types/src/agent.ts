export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentRequest {
  messages: ChatMessage[];
  articleId?: string;
}

export interface AgentResponse {
  message: string;
  sources?: Array<{ title: string; url: string; source: string }>;
}

export interface AudioRequest {
  text: string;
  articleId: string;
}

export interface AudioResponse {
  audioUrl: string;
}
