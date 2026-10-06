import { Payload } from '@nestjs/microservices';
import { McpController, Prompt, type PromptResult } from '@rekog/mcp-nest';
import { z } from 'zod';

@McpController()
export class NotesMcpPrompt {
  @Prompt({
    name: 'ikeen-workspace',
    description: 'Instructions on how to navigate, search, and update notes and folders in iKeen',
    parameters: z.object({
      task: z.string().describe('The user objective, e.g. finding information or drafting a note'),
    }),
  })
  getWorkspacePrompt(@Payload() { task }: { task: string }): PromptResult {
    return {
      description: 'iKeen Workspace Assistant Guidelines',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Task: ${task}`,
              '',
              'When interacting with the user iKeen workspace:',
              '1. Always call `ikeen_search_notes` or `ikeen_list_recent_notes` first to find existing context before creating or altering notes.',
              '2. To read full details of a note, call `ikeen_get_note_details` or inspect the `ikeen://notes/{noteId}` resource.',
              '3. When updating a note, prefer appending (`appendContent`) or updating tags unless the user specifically asks to rewrite it. Note that full content replacements return a confirmation diff preview unless `confirm: true` is passed.',
              '4. To organize notes into categories, check existing folders with `ikeen_list_folders` and use `ikeen_organize_note`.',
            ].join('\n'),
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'synthesize-notes',
    description: 'Instructions to synthesize multiple notes into a structured summary or action plan',
    parameters: z.object({
      topic: z.string().describe('Topic or tag to synthesize notes about'),
    }),
  })
  getSynthesizePrompt(@Payload() { topic }: { topic: string }): PromptResult {
    return {
      description: 'Synthesize iKeen Notes by Topic',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Search for all notes relating to "${topic}" using \`ikeen_search_notes\`. Read the relevant notes and synthesize their key points, decisions, and action items into a clean, markdown structured document.`,
          },
        },
      ],
    };
  }
}
