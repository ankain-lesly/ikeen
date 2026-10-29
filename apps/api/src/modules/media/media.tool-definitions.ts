import { z } from 'zod';

export const generateImageKeenDef = {
  name: 'ikeen_generate_image',
  toolName: 'generateImageKeen',
  description:
    'Generate an image from a detailed visual description and upload it directly to cloud storage. Returns a public CDN URL (not base64) that can be viewed or attached to notes.',
  inputSchema: z.object({
    description: z
      .string()
      .trim()
      .min(1)
      .describe('Detailed visual description or prompt for the image to generate'),
  }),
};
