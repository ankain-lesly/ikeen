import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  color?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  pinCode?: string | null;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
