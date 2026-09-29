import { createHash } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../common/public.decorator";
import type { RequestWithContext } from "../common/request-context";
import { ROLES_KEY } from "../common/roles.decorator";
import { PrismaService } from "../database/prisma.service";
import type { Role } from "../generated/prisma/enums";
import { sessionCookieName } from "./session-cookie";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const token = request.cookies?.[sessionCookieName()] as string | undefined;
    if (!token) {
      throw new UnauthorizedException({ code: "AUTH_REQUIRED", message: "로그인이 필요합니다." });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const session = await this.prisma.client.session.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
        absoluteExpiresAt: { gt: now },
        user: { disabledAt: null },
      },
      include: { user: true },
    });
    if (!session) {
      throw new UnauthorizedException({ code: "SESSION_EXPIRED", message: "세션이 만료되었습니다." });
    }

    request.sessionId = session.id;
    request.user = {
      id: session.user.id,
      email: session.user.email,
      nickname: session.user.nickname,
      role: session.user.role,
    };

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(session.user.role)) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "접근 권한이 없습니다." });
    }

    const idleSeconds = Number(process.env.SESSION_IDLE_TTL_SECONDS ?? 86400);
    const nextExpiry = new Date(Math.min(Date.now() + idleSeconds * 1000, session.absoluteExpiresAt.getTime()));
    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      await this.prisma.client.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now, expiresAt: nextExpiry },
      });
    }
    return true;
  }
}
