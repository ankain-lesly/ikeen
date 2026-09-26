import { IsOptional, IsString } from 'class-validator';

export class CheckUpdatesQueryDto {
  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  currentVersion?: string;

  @IsString()
  @IsOptional()
  currentBuild?: string;
}
