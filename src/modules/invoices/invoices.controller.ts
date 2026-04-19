import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Invoices')
@ApiSecurity('api-key')
@UseGuards(ScopesGuard)
@RequireScopes('USER')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Upload an invoice file for AI extraction' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Invoice file (PDF, JPEG, PNG, WEBP — max 10 MB)' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Invoice created, extraction queued' })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.upload(user.id, file);
  }

  @Get()
  @ApiOperation({ summary: 'List own invoices (latest 50)' })
  @ApiResponse({ status: 200, description: 'Array of invoices (no file data)' })
  list(@CurrentUser() user: User) {
    return this.service.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice' })
  @ApiParam({ name: 'id', example: 'cm9inv001xyz' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(id, user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update editable invoice fields' })
  @ApiParam({ name: 'id', example: 'cm9inv001xyz' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fromName: { type: 'string', nullable: true },
        amount:   { type: 'string', nullable: true },
        currency: { type: 'string', nullable: true },
        itemTags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  updateFields(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { fromName?: string | null; amount?: string | null; currency?: string | null; itemTags?: string[] },
  ) {
    return this.service.update(id, user.id, body);
  }

  @Patch(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('ADMIN')
  @ApiOperation({ summary: 'Mark invoice as paid (admin)' })
  @ApiParam({ name: 'id', example: 'cm9inv001xyz' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paidTxHash'],
      properties: {
        paidTxHash: { type: 'string', example: '0xabc123...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invoice already paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  markPaid(@Param('id') id: string, @Body('paidTxHash') paidTxHash: string) {
    return this.service.markPaid(id, paidTxHash);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('ADMIN')
  @ApiOperation({ summary: 'Delete an invoice (admin)' })
  @ApiParam({ name: 'id', example: 'cm9inv001xyz' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
