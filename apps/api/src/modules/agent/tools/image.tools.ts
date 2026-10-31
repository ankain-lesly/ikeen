import { tool } from 'ai';
import type { MediaService } from '../../media/media.service.js';
import { generateImageKeenDef } from '../../media/media.tool-definitions.js';
import { ikeenAgentCallOptionsSchema as baseContextSchema } from '../call-options.js';

export function createImageTools(params: {
  mediaService: MediaService;
}) {
  const generateImageKeen = tool({
    description: generateImageKeenDef.description,
    contextSchema: baseContextSchema,
    inputSchema: generateImageKeenDef.inputSchema,
    execute: async (args, { context }) => {
      return params.mediaService.generateAndUploadImage(
        args.description,
        context.userId,
      );
    },
  });

  return {
    generateImageKeen,
  };
}
