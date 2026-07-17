import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreeholeComment, TreeholePost } from './treehole.entity';
import { TreeholeService } from './treehole.service';
import { TreeholeController } from './treehole.controller';
import { SocialModule } from '../common/social.module';

@Module({
  imports: [TypeOrmModule.forFeature([TreeholePost, TreeholeComment]), SocialModule],
  providers: [TreeholeService],
  controllers: [TreeholeController],
  exports: [TreeholeService],
})
export class TreeholeModule {}
