import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { Review } from './review.entity';
import { Item } from '../items/item.entity';
import { User } from '../users/user.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ItemsModule } from '../items/items.module';
import { SocialModule } from '../common/social.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Review, Item, User]), ItemsModule, SocialModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
