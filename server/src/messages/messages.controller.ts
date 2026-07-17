import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class SendDto {
  @IsInt()
  toId: number;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsInt()
  itemId?: number;
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messages: MessagesService) {}

  @Get('conversations')
  conversations(@Req() req: any) {
    return this.messages.conversations(req.user.userId);
  }

  @Get('with/:peerId')
  thread(@Req() req: any, @Param('peerId') peerId: string) {
    return this.messages.thread(req.user.userId, Number(peerId));
  }

  @Post()
  send(@Req() req: any, @Body() dto: SendDto) {
    return this.messages.send(req.user.userId, dto.toId, dto.content, dto.itemId);
  }
}
