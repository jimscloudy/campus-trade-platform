import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async register(username: string, password: string, nickname?: string, campus?: string) {
    const exists = await this.users.findByUsername(username);
    if (exists) throw new ConflictException('用户名已存在');
    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.create({
      username,
      password: hash,
      nickname: nickname || username,
      campus: campus || '主校区',
      role: 'user',
      creditScore: 80,
    });
    return this.tokenResponse(user.id, user.username, user.role);
  }

  async login(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('用户名或密码错误');
    return this.tokenResponse(user.id, user.username, user.role);
  }

  private async tokenResponse(userId: number, username: string, role: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, username, role });
    const user = await this.users.findById(userId);
    return {
      accessToken,
      user: this.users.sanitize(user!),
    };
  }
}
