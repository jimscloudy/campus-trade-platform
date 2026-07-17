import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block, Favorite, Notification, Offer, Report } from './entities';
import { Item } from '../items/item.entity';
import { User } from '../users/user.entity';
import { Category } from '../items/category.entity';
import { TreeholePost } from '../treehole/treehole.entity';
import { SocialService } from './social.service';
import { NotifyService } from './notify.service';
import { SocialController } from './social.controller';
import { UploadController } from '../upload/upload.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Favorite,
      Offer,
      Notification,
      Report,
      Block,
      Item,
      User,
      Category,
      TreeholePost,
    ]),
  ],
  providers: [SocialService, NotifyService],
  controllers: [SocialController, UploadController],
  exports: [SocialService, NotifyService],
})
export class SocialModule {}
