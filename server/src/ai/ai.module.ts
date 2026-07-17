import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiConfigService } from './ai-config.service';
import { Item } from '../items/item.entity';
import { Category } from '../items/category.entity';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Favorite, Notification, Report } from '../common/entities';
import { TreeholePost } from '../treehole/treehole.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Item,
      Category,
      Order,
      User,
      Favorite,
      Notification,
      Report,
      TreeholePost,
    ]),
  ],
  providers: [AiConfigService, AiService],
  controllers: [AiController],
  exports: [AiService, AiConfigService],
})
export class AiModule {}
