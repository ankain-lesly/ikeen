import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderBlocksDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  blockIds: string[];
}
