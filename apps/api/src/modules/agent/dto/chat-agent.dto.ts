import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';
import type { UIMessage } from 'ai';

export class ChatAgentDto {
  @IsArray()
  @ArrayNotEmpty()
  messages: UIMessage[];

  @IsOptional()
  @IsString()
  conversationId?: string;
}
