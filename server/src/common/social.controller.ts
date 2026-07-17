import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SocialService } from './social.service';
import { NotifyService } from './notify.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

class OfferDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  message?: string;
}

class ReportDto {
  @IsIn(['item', 'user', 'treehole'])
  targetType: 'item' | 'user' | 'treehole';

  @IsNumber()
  targetId: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

@Controller()
export class SocialController {
  constructor(
    private social: SocialService,
    private notify: NotifyService,
  ) {}

  // favorites
  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  favorites(@Req() req: any) {
    return this.social.myFavorites(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites/:itemId')
  isFav(@Req() req: any, @Param('itemId') itemId: string) {
    return this.social.isFavorited(req.user.userId, Number(itemId));
  }

  @UseGuards(JwtAuthGuard)
  @Post('favorites/:itemId')
  addFav(@Req() req: any, @Param('itemId') itemId: string) {
    return this.social.addFavorite(req.user.userId, Number(itemId));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('favorites/:itemId')
  removeFav(@Req() req: any, @Param('itemId') itemId: string) {
    return this.social.removeFavorite(req.user.userId, Number(itemId));
  }

  // offers
  @UseGuards(JwtAuthGuard)
  @Post('items/:itemId/offers')
  createOffer(@Req() req: any, @Param('itemId') itemId: string, @Body() dto: OfferDto) {
    return this.social.createOffer(req.user.userId, Number(itemId), dto.price, dto.message);
  }

  @UseGuards(JwtAuthGuard)
  @Get('items/:itemId/offers')
  listOffers(@Req() req: any, @Param('itemId') itemId: string) {
    return this.social.listOffersForItem(Number(itemId), req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('offers')
  myOffers(@Req() req: any, @Query('role') role?: 'buyer' | 'seller') {
    return this.social.myOffers(req.user.userId, role || 'buyer');
  }

  @UseGuards(JwtAuthGuard)
  @Patch('offers/:id')
  respondOffer(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'accepted' | 'rejected' },
  ) {
    return this.social.respondOffer(Number(id), req.user.userId, body.status);
  }

  // notifications
  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  notifications(@Req() req: any, @Query('page') page?: number) {
    return this.notify.list(req.user.userId, Number(page) || 1);
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications/unread-count')
  unread(@Req() req: any) {
    return this.notify.unreadCount(req.user.userId).then((count) => ({ count }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('notifications/read')
  markRead(@Req() req: any, @Body() body: { id?: number }) {
    return this.notify.markRead(req.user.userId, body?.id);
  }

  // report / block
  @UseGuards(JwtAuthGuard)
  @Post('reports')
  report(@Req() req: any, @Body() dto: ReportDto) {
    return this.social.report(req.user.userId, dto.targetType, dto.targetId, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Get('blocks')
  blocks(@Req() req: any) {
    return this.social.myBlocks(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('blocks/:userId')
  block(@Req() req: any, @Param('userId') userId: string) {
    return this.social.block(req.user.userId, Number(userId));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('blocks/:userId')
  unblock(@Req() req: any, @Param('userId') userId: string) {
    return this.social.unblock(req.user.userId, Number(userId));
  }

  // admin
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/stats')
  adminStats() {
    return this.social.adminStats();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/reports')
  adminReports(@Query('status') status?: string) {
    return this.social.adminListReports(status);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/reports/:id')
  adminHandleReport(
    @Param('id') id: string,
    @Body() body: { status: 'resolved' | 'rejected'; adminNote?: string },
  ) {
    return this.social.adminHandleReport(Number(id), body.status, body.adminNote);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/items')
  adminItems(@Query('status') status?: string) {
    return this.social.adminListItems(status);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/items/:id/off')
  adminOff(@Param('id') id: string) {
    return this.social.adminOffItem(Number(id));
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/categories')
  adminCats() {
    return this.social.adminCategories();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/categories')
  adminSaveCat(@Body() body: { id?: number; name: string; sort?: number }) {
    return this.social.adminSaveCategory(body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('admin/categories/:id')
  adminDelCat(@Param('id') id: string) {
    return this.social.adminDeleteCategory(Number(id));
  }
}
