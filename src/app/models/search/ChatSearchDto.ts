import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class ChatSearchDto extends SearchDto {
  @prop() sessionId?: string;
  @prop() type?: 'USER' | 'ASSISTANT' | string;
  @prop() timestampFrom?: string;
  @prop() timestampTo?: string;

  public constructor(init?: Partial<ChatSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
