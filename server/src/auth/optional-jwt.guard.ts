import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization;
    if (!auth) return true;
    return super.canActivate(context) as any;
  }
}
