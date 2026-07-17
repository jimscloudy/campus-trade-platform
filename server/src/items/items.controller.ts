import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  campus?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  images?: string[];
}

@Controller('items')
export class ItemsController {
  constructor(private items: ItemsService) {}

  @Get('categories')
  categories() {
    return this.items.listCategories();
  }

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('categoryId') categoryId?: number,
    @Query('campus') campus?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sellerId') sellerId?: number,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.items.list({
      keyword,
      categoryId,
      campus,
      minPrice,
      maxPrice,
      sellerId,
      status,
      page,
      pageSize,
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.items.detail(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateItemDto) {
    return this.items.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateItemDto>) {
    return this.items.update(Number(id), req.user.userId, dto as any);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.items.remove(Number(id), req.user.userId);
  }
}
