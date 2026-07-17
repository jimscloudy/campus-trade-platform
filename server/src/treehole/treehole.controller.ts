import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TreeholeService } from './treehole.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsString()
  mood?: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  nickname?: string;
}

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  nickname?: string;
}

@Controller('treehole')
export class TreeholeController {
  constructor(private treehole: TreeholeService) {}

  @Get()
  list(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.treehole.list(Number(page) || 1, Number(pageSize) || 20);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.treehole.create(req.user.userId, dto);
  }

  @Post(':id/like')
  like(@Param('id') id: string) {
    return this.treehole.like(Number(id));
  }

  @Get(':id/comments')
  comments(@Param('id') id: string) {
    return this.treehole.listComments(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(@Req() req: any, @Param('id') id: string, @Body() dto: CreateCommentDto) {
    return this.treehole.addComment(Number(id), req.user.userId, dto);
  }
}
