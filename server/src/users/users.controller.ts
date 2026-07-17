import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const user = await this.users.findById(req.user.userId);
    return this.users.sanitize(user!);
  }

  @Get(':id')
  async profile(@Param('id') id: string) {
    const user = await this.users.findById(Number(id));
    if (!user) return null;
    return this.users.sanitize(user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Req() req: any, @Body() body: { nickname?: string; campus?: string; bio?: string; avatar?: string }) {
    const user = await this.users.updateProfile(req.user.userId, body);
    return this.users.sanitize(user);
  }
}
