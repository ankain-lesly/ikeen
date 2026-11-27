import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpsertBlockDto {
  @IsIn(['text', 'list', 'media'])
  type: 'text' | 'list' | 'media';

  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;

  /** Text: markdown string | List: ListItem[] | Media: MediaItem[] */
  @IsOptional()
  content?: unknown;

  @IsIn(['checkbox', 'bullet', 'ordered'])
  @IsOptional()
  listType?: 'checkbox' | 'bullet' | 'ordered';

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsOptional()
  header?: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsOptional()
  footer?: string | null;
}
