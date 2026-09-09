export class ChatPromptRequest {
  message?: string;

  public constructor(init?: Partial<ChatPromptRequest>) {
    Object.assign(this, init);
  }
}
