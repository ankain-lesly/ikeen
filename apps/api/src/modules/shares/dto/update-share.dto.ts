import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { ShareAccess } from '@repo/types/shares';

export class UpdateShareDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsIn(['view', 'copy'])
  @IsOptional()
  access?: ShareAccess;

  @ValidateIf((_, v) => v !== null)
  @IsISO8601()
  @IsOptional()
  expiresAt?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MinLength(4)
  @MaxLength(128)
  @IsOptional()
  password?: string | null;

  @IsBoolean()
  @IsOptional()
  rotateSlug?: boolean;
}
