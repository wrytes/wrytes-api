import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['recipientName', 'items'],
      properties: {
        recipientName:    { type: 'string' },
        recipientEmail:   { type: 'string', nullable: true },
        recipientAddress: { type: 'string', nullable: true },
        currency:         { type: 'string', example: 'CHF' },
        issueDate:        { type: 'string', format: 'date' },
        dueDate:          { type: 'string', format: 'date', nullable: true },
        notes:            { type: 'string', nullable: true },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['description', 'quantity', 'unitPrice'],
            properties: {
              description: { type: 'string' },
              quantity:    { type: 'number' },
              unitPrice:   { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  create(@CurrentUser() user: User, @Body() body: Parameters<typeof this.service.create>[1]) {
    return this.service.create(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List own invoices' })
  @ApiResponse({ status: 200, description: 'Array of invoices' })
  list(@CurrentUser() user: User) {
    return this.service.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(id, user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a draft invoice' })
  @ApiParam({ name: 'id' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: Parameters<typeof this.service.update>[2],
  ) {
    return this.service.update(id, user.id, body);
  }

  @Patch(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark invoice as sent' })
  @ApiParam({ name: 'id' })
  send(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.send(id, user.id);
  }

  @Patch(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiParam({ name: 'id' })
  markPaid(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.markPaid(id, user.id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an invoice' })
  @ApiParam({ name: 'id' })
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.cancel(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.delete(id, user.id);
  }
}
