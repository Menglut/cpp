import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import type { Request } from "express";
import { PrismaService } from "../database/prisma.service";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import { AuthRateLimitService } from "./auth-rate-limit.service";

type SessionResult = {
  token: string;
  maxAgeMs: number;
  user: { id: string; email: string; nickname: string; role: "USER" | "ADMIN" };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: AuthRateLimitService,
  ) {}

  async register(dto: RegisterDto, request: Request): Promise<SessionResult> {
    const email = dto.email.trim().toLowerCase();
    const invitationPreview = await this.getInvitation(dto.inviteToken);
    if (invitationPreview.email !== email) this.invalidInvitation();
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const tokenHash = this.hashInvitationToken(dto.inviteToken);
    const user = await this.prisma.transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
      });
      const now = new Date();
      if (
        !invitation ||
        invitation.email !== email ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= now
      ) {
        this.invalidInvitation();
      }

      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        throw new ConflictException({
          code: "EMAIL_ALREADY_REGISTERED",
          message: "이미 가입된 이메일입니다.",
        });
      }

      const claimed = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) this.invalidInvitation();

      const created = await tx.user.create({
        data: { email, nickname: dto.nickname.trim(), passwordHash },
      });
      await tx.auditLog.create({
        data: {
          actorId: created.id,
          action: "INVITATION_ACCEPT",
          targetType: "Invitation",
          targetId: invitation.id,
          metadata: { email },
        },
      });
      return created;
    });
    return this.createSession(user, request);
  }

  async getInvitation(token: string) {
    const invitation = await this.prisma.client.invitation.findUnique({
      where: { tokenHash: this.hashInvitationToken(token) },
      select: {
        email: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= new Date()
    ) {
      this.invalidInvitation();
    }
    return { email: invitation.email, expiresAt: invitation.expiresAt };
  }

  async login(dto: LoginDto, request: Request): Promise<SessionResult> {
    const email = dto.email.trim().toLowerCase();
    await this.rateLimit.consume(email, request.ip ?? "unknown");
    const user = await this.prisma.client.user.findUnique({ where: { email } });
    const valid = user
      ? await argon2.verify(user.passwordHash, dto.password)
      : false;
    if (!user || !valid || user.disabledAt) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "이메일 또는 비밀번호를 확인해 주세요.",
      });
    }
    await this.rateLimit.reset(email);
    return this.createSession(user, request);
  }

  async logout(sessionId?: string): Promise<void> {
    if (!sessionId) return;
    await this.prisma.client.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async createSession(
    user: {
      id: string;
      email: string;
      nickname: string;
      role: "USER" | "ADMIN";
    },
    request: Request,
  ): Promise<SessionResult> {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const idleSeconds = Number(process.env.SESSION_IDLE_TTL_SECONDS ?? 86400);
    const absoluteSeconds = Number(
      process.env.SESSION_ABSOLUTE_TTL_SECONDS ?? 604800,
    );
    const now = Date.now();
    await this.prisma.client.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now + idleSeconds * 1000),
        absoluteExpiresAt: new Date(now + absoluteSeconds * 1000),
        userAgent: request.header("user-agent")?.slice(0, 512),
        ipAddress: request.ip?.slice(0, 64),
      },
    });
    return { token, maxAgeMs: absoluteSeconds * 1000, user };
  }

  private hashInvitationToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private invalidInvitation(): never {
    throw new BadRequestException({
      code: "INVALID_INVITATION",
      message: "유효하지 않거나 만료된 초대입니다.",
    });
  }
}
