import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { SocialModule } from '../common/social.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), SocialModule],
  providers: [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}
