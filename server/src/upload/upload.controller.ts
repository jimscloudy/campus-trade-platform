import {
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function ensureUploadDir() {
  const dir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

@Controller('upload')
export class UploadController {
  @UseGuards(JwtAuthGuard)
  @Post('images')
  @UseInterceptors(
    FilesInterceptor('files', 6, {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, ensureUploadDir()),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname).toLowerCase() || '.jpg'}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('仅支持图片文件') as any, false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('请选择图片');
    return {
      urls: files.map((f) => `/uploads/${f.filename}`),
    };
  }
}
