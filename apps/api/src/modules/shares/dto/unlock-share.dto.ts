import { IsString, MaxLength, MinLength } from 'class-validator';

export class UnlockShareDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
