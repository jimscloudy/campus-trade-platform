import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { AdminGuard } from '../auth/admin.guard';

class ChatMsgDto {
  @IsIn(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty()
  content: string;
}

class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMsgDto)
  messages: ChatMsgDto[];

  @IsOptional()
  @IsIn(['fast', 'strong'])
  mode?: 'fast' | 'strong';
}

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Get('status')
  status() {
    return this.ai.status();
  }

  @Get('ping')
  ping() {
    return this.ai.ping();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('providers')
  listProviders() {
    return this.ai.listProviders();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('providers/switch')
  switchProvider(@Body() body: { id: string }) {
    return this.ai.switchProvider(body.id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('providers/:id')
  updateProvider(
    @Param('id') id: string,
    @Body() body: { name?: string; baseUrl?: string; apiKey?: string; model?: string; modelStrong?: string },
  ) {
    return this.ai.updateProvider(id, body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('providers')
  addProvider(
    @Body()
    body: {
      id?: string;
      name: string;
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      modelStrong?: string;
    },
  ) {
    return this.ai.addProvider(body);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('chat')
  chat(@Req() req: any, @Body() dto: ChatDto) {
    return this.ai.chat(dto.messages, req.user?.userId, dto.mode || 'fast');
  }

  @Post('copywrite')
  copywrite(
    @Body()
    body: {
      title?: string;
      description?: string;
      category?: string;
      condition?: string;
      campus?: string;
      price?: number;
    },
  ) {
    return this.ai.copywrite(body || {});
  }

  @Post('price-suggest')
  priceSuggest(
    @Body() body: { title: string; description?: string; condition?: string; category?: string },
  ) {
    return this.ai.priceSuggest(body);
  }

  @Post('bargain')
  bargain(
    @Body() body: { title: string; listPrice: number; offerPrice?: number; role: 'buyer' | 'seller' },
  ) {
    return this.ai.bargain(body);
  }

  @Post('fraud-check')
  fraud(@Body() body: { text: string }) {
    return this.ai.fraudCheck(body?.text || '');
  }

  @Post('moderate')
  moderate(@Body() body: { content: string }) {
    return this.ai.moderate(body?.content || '');
  }

  @Post('nl-search')
  nlSearch(@Body() body: { query: string }) {
    return this.ai.nlSearch(body?.query || '');
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('recommend')
  recommend(@Req() req: any) {
    return this.ai.recommend(req.user?.userId);
  }

  @Post('treehole-comfort')
  comfort(@Body() body: { content: string }) {
    return this.ai.treeholeComfort(body?.content || '');
  }

  @Post('message-draft')
  draft(
    @Body() body: { peerName?: string; itemTitle?: string; intent: string; tone?: string },
  ) {
    return this.ai.messageDraft(body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('report-summary')
  reportSummary() {
    return this.ai.reportSummary();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('insights')
  insights() {
    return this.ai.insights();
  }
}
