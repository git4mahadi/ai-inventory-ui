export type ChatMessageType = 'USER' | 'ASSISTANT';

export class ChatResponse {
  id?: string;
  conversationId?: string;
  sessionId?: string;
  mobile?: string;
  content?: string;
  type?: ChatMessageType | string;
  timestamp?: string;
}
