import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ApiKeyController } from './api-key.controller.js';
import { ApiKeyService } from './api-key.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { EnvService } from '../../config/env.service.js';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        secret: env.JWT_SECRET,
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [AuthController, ApiKeyController],
  providers: [AuthService, ApiKeyService, JwtStrategy],
  exports: [AuthService, ApiKeyService, JwtModule, PassportModule],
})
export class AuthModule {}
