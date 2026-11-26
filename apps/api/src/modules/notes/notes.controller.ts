import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotesService } from './notes.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { ListNotesQueryDto } from './dto/list-notes-query.dto.js';
import { UpsertBlockDto } from './dto/upsert-block.dto.js';
import { ReorderBlocksDto } from './dto/reorder-blocks.dto.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListNotesQueryDto,
  ) {
    return this.notesService.findAll(req.user.id, query);
  }

  @Get('trash')
  async findTrashed(@Req() req: AuthenticatedRequest) {
    return this.notesService.findTrashed(req.user.id);
  }

  @Get(':id')
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notesService.findOne(req.user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.create(req.user.id, dto);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notesService.restore(req.user.id, id);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(req.user.id, id, dto);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  async permanentDelete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notesService.permanentDelete(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDelete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notesService.softDelete(req.user.id, id);
  }

  @Put(':id/blocks/:blockId')
  async upsertBlock(
    @Req() req: AuthenticatedRequest,
    @Param('id') noteId: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpsertBlockDto,
  ) {
    return this.notesService.upsertBlock(req.user.id, noteId, blockId, dto);
  }

  @Delete(':id/blocks/:blockId')
  @HttpCode(HttpStatus.OK)
  async softDeleteBlock(
    @Req() req: AuthenticatedRequest,
    @Param('id') noteId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.notesService.softDeleteBlock(req.user.id, noteId, blockId);
  }

  @Patch(':id/blocks/reorder')
  async reorderBlocks(
    @Req() req: AuthenticatedRequest,
    @Param('id') noteId: string,
    @Body() dto: ReorderBlocksDto,
  ) {
    return this.notesService.reorderBlocks(req.user.id, noteId, dto.blockIds);
  }
}
