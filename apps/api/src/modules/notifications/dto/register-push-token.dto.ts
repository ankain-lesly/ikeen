import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsIn(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;
}

export class DeregisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
