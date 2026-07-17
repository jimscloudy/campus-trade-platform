import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateOrderDto {
  @IsInt()
  itemId: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

class StatusDto {
  @IsIn(['agreed', 'completed', 'cancelled'])
  status: 'agreed' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  meetPlace?: string;

  @IsOptional()
  @IsString()
  meetTime?: string;
}

class ReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  content?: string;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.orders.create(req.user.userId, dto.itemId, dto.remark);
  }

  @Get()
  list(@Req() req: any, @Query('role') role?: 'buyer' | 'seller') {
    return this.orders.myOrders(req.user.userId, role);
  }

  @Get(':id')
  detail(@Req() req: any, @Param('id') id: string) {
    return this.orders.detail(Number(id), req.user.userId);
  }

  @Patch(':id/status')
  status(@Req() req: any, @Param('id') id: string, @Body() dto: StatusDto) {
    return this.orders.updateStatus(Number(id), req.user.userId, dto);
  }

  @Post(':id/reviews')
  review(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.orders.review(Number(id), req.user.userId, dto.score, dto.content);
  }
}
