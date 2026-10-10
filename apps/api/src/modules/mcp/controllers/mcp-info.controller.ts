import { Controller, Get } from '@nestjs/common';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import {
  searchNotesDef,
  getNoteDetailsDef,
  listRecentNotesDef,
  createNoteDef,
  updateNoteDef,
  pinNoteDef,
  archiveNoteDef,
  deleteNoteDef,
} from '../../notes/notes.tool-definitions.js';
import {
  listFoldersDef,
  createFolderDef,
  updateFolderDef,
  organizeNoteDef,
} from '../../folders/folders.tool-definitions.js';

export interface McpToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface McpToolItem {
  name: string;
  description: string;
  category: 'notes' | 'folders';
  parameters: McpToolParameter[];
}

export interface McpPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface McpPromptItem {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
}

export interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  transport: string;
  endpoint: string;
  toolsCount: number;
  promptsCount: number;
}

function inspectZodField(field: any): {

  type: string;
  isOptional: boolean;
  description: string;
} {
  let curr = field;
  let isOptional = false;
  let description = field?.description || '';

  while (curr && (curr._def || curr.def)) {
    if (!description && (curr.description || curr._def?.description)) {
      description = curr.description || curr._def?.description || '';
    }

    const t = curr._def?.type || curr.def?.type || curr._def?.typeName || '';

    if (
      t === 'default' ||
      t === 'ZodDefault' ||
      t === 'optional' ||
      t === 'ZodOptional' ||
      t === 'nullable' ||
      t === 'ZodNullable'
    ) {
      isOptional = true;
      curr = curr._def?.innerType || curr.def?.innerType;
    } else if (t === 'pipe') {
      curr = curr.in || curr._def?.in;
    } else if (t === 'transform' || t === 'ZodEffects') {
      curr = curr._def?.schema || curr.in || curr._def?.innerType;
    } else if (t === 'union' || t === 'ZodUnion') {
      isOptional = true;
      curr = (curr._def?.options || curr.def?.options || [])[0];
    } else {
      break;
    }
  }

  const rawType = (
    curr?._def?.type ||
    curr?.def?.type ||
    curr?._def?.typeName ||
    'string'
  ).toLowerCase();

  let finalType = 'string';
  if (rawType.includes('number')) finalType = 'number';
  else if (rawType.includes('bool')) finalType = 'boolean';
  else if (rawType.includes('array')) finalType = 'array';
  else if (rawType.includes('object')) finalType = 'object';

  return {
    type: finalType,
    isOptional,
    description: description || curr?.description || '',
  };
}

@Controller(['mcp', 'api/v1/mcp'])
export class McpInfoController {
  private formatTool(
    def: { name: string; description: string; inputSchema: z.ZodObject<any> | any },
    category: 'notes' | 'folders',
  ): McpToolItem {
    const shape = def.inputSchema?.shape || {};
    const parameters: McpToolParameter[] = Object.entries(shape).map(
      ([key, field]) => {
        const inspected = inspectZodField(field);

        return {
          name: key,
          type: inspected.type,
          description: inspected.description,
          required: !inspected.isOptional,
        };
      },
    );

    return {
      name: def.name,
      description: def.description,
      category,
      parameters,
    };
  }

  @Get('tools')
  getTools(): McpToolItem[] {
    const notesTools = [
      this.formatTool(searchNotesDef, 'notes'),
      this.formatTool(getNoteDetailsDef, 'notes'),
      this.formatTool(listRecentNotesDef, 'notes'),
      this.formatTool(createNoteDef, 'notes'),
      this.formatTool(updateNoteDef, 'notes'),
      this.formatTool(pinNoteDef, 'notes'),
      this.formatTool(archiveNoteDef, 'notes'),
      this.formatTool(deleteNoteDef, 'notes'),
    ];

    const foldersTools = [
      this.formatTool(listFoldersDef, 'folders'),
      this.formatTool(createFolderDef, 'folders'),
      this.formatTool(updateFolderDef, 'folders'),
      this.formatTool(organizeNoteDef, 'folders'),
    ];

    return [...notesTools, ...foldersTools];
  }

  @Get('prompts')
  getPrompts(): McpPromptItem[] {
    return [
      {
        name: 'ikeen-workspace',
        description: 'Instructions on how to navigate, search, and update notes and folders in iKeen',
        arguments: [
          {
            name: 'task',
            description: 'The user objective, e.g. finding information or drafting a note',
            required: true,
          },
        ],
      },
      {
        name: 'synthesize-notes',
        description: 'Instructions to synthesize multiple notes into a structured summary or action plan',
        arguments: [
          {
            name: 'topic',
            description: 'Topic or tag to synthesize notes about',
            required: true,
          },
        ],
      },
      {
        name: 'weekly-review',
        description: 'Review and synthesize notes from the past week into accomplishments, insights, and next steps',
        arguments: [
          {
            name: 'focus',
            description: 'Optional specific focus or objective to highlight during the review',
            required: false,
          },
        ],
      },
      {
        name: 'extract-action-items',
        description: 'Extract actionable tasks, deadlines, and owners from notes matching a topic or query',
        arguments: [
          {
            name: 'query',
            description: 'Search query, topic, or keyword to extract tasks from',
            required: true,
          },
        ],
      },
      {
        name: 'organize-inbox',
        description: 'Review uncategorized notes and propose moving them into appropriate folders',
        arguments: [],
      },
    ];
  }

  @Get('info')
  getInfo(): McpServerInfo {
    const tools = this.getTools();
    const prompts = this.getPrompts();
    return {
      name: 'ikeen-mcp-server',
      version: '1.0.0',
      protocolVersion: LATEST_PROTOCOL_VERSION,
      transport: 'Streamable HTTP',
      endpoint: '/mcp',
      toolsCount: tools.length,
      promptsCount: prompts.length,
    };
  }
}

