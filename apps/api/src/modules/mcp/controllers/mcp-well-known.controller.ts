import { Controller, Get } from '@nestjs/common';
import { EnvService } from '../../../config/env.service.js';

export interface OAuthProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported: string[];
  scopes_supported: string[];
  resource_documentation: string;
}

@Controller(['.well-known', 'api/v1/.well-known'])
export class McpWellKnownController {
  constructor(private readonly env: EnvService) {}

  private buildMetadata(): OAuthProtectedResourceMetadata {
    return {
      resource: this.env.getMcpResourceUrl(),
      authorization_servers: [],
      bearer_methods_supported: ['header'],
      scopes_supported: [
        'notes:read',
        'notes:write',
        'folders:read',
        'folders:write',
      ],
      resource_documentation: this.env.getMcpDocsUrl(),
    };
  }

  @Get('oauth-protected-resource')
  getOAuthProtectedResource(): OAuthProtectedResourceMetadata {
    return this.buildMetadata();
  }

  @Get('oauth-protected-resource/mcp')
  getOAuthProtectedResourceMcp(): OAuthProtectedResourceMetadata {
    return this.buildMetadata();
  }
}
