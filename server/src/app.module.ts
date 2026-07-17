import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ItemsModule } from './items/items.module';
import { OrdersModule } from './orders/orders.module';
import { MessagesModule } from './messages/messages.module';
import { TreeholeModule } from './treehole/treehole.module';
import { SocialModule } from './common/social.module';
import { AiModule } from './ai/ai.module';
import { SeedService } from './common/seed.service';
import { User } from './users/user.entity';
import { Category } from './items/category.entity';
import { Item } from './items/item.entity';
import { Order } from './orders/order.entity';
import { Message } from './messages/message.entity';
import { Review } from './orders/review.entity';
import { TreeholeComment, TreeholePost } from './treehole/treehole.entity';
import { Block, Favorite, Notification, Offer, Report } from './common/entities';

const entities = [
  User,
  Category,
  Item,
  Order,
  Message,
  Review,
  TreeholePost,
  TreeholeComment,
  Favorite,
  Offer,
  Notification,
  Report,
  Block,
];
const dbType = process.env.DB_TYPE || 'sqljs';
const dbPath = process.env.DB_PATH || join(process.cwd(), 'data', 'campus.db');

const dbConfig =
  dbType === 'mysql'
    ? {
        type: 'mysql' as const,
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        username: process.env.DB_USER || 'campus',
        password: process.env.DB_PASSWORD || 'campus123',
        database: process.env.DB_NAME || 'campus_trade',
        entities,
        synchronize: true,
        retryAttempts: 30,
        retryDelay: 2000,
      }
    : {
        type: 'sqljs' as const,
        location: dbPath,
        autoSave: true,
        entities,
        synchronize: true,
      };

@Module({
  imports: [
    TypeOrmModule.forRoot(dbConfig),
    TypeOrmModule.forFeature([User, Category, Item, TreeholePost]),
    AuthModule,
    UsersModule,
    ItemsModule,
    OrdersModule,
    MessagesModule,
    TreeholeModule,
    SocialModule,
    AiModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
