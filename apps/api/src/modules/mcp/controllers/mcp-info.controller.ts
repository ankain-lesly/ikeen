import { Controller, Get } from '@nestjs/common';
import {
  searchNotesDef,
  getNoteDetailsDef,
  listRecentNotesDef,
  createNoteDef,
  updateNoteDef,
  pinNoteDef,
  archiveNoteDef,
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

export interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  transport: string;
  endpoint: string;
  toolsCount: number;
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
    def: { name: string; description: string; inputSchema: any },
    category: 'notes' | 'folders',
  ): McpToolItem {
    const shape = def.inputSchema?.shape || {};
    const parameters: McpToolParameter[] = Object.entries(shape).map(
      ([key, field]: [string, any]) => {
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
    ];

    const foldersTools = [
      this.formatTool(listFoldersDef, 'folders'),
      this.formatTool(createFolderDef, 'folders'),
      this.formatTool(updateFolderDef, 'folders'),
      this.formatTool(organizeNoteDef, 'folders'),
    ];

    return [...notesTools, ...foldersTools];
  }

  @Get('info')
  getInfo(): McpServerInfo {
    const tools = this.getTools();
    return {
      name: 'ikeen-mcp-server',
      version: '1.0.0',
      protocolVersion: '2026-07-28',
      transport: 'Streamable HTTP',
      endpoint: '/mcp',
      toolsCount: tools.length,
    };
  }
}
