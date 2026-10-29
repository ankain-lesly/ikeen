import { tool } from 'ai';
import { z } from 'zod';
import type { MediaService } from '../../media/media.service.js';
import { generateImageKeenDef } from '../../media/media.tool-definitions.js';

const baseContextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

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
