import { IsOptional, IsString } from 'class-validator';

export class SyncPullDto {
  @IsString()
  @IsOptional()
  since?: string;
}
