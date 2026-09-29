import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CurrentUser } from "../common/current-user.decorator";
import { Public } from "../common/public.decorator";
import type { AuthenticatedUser, RequestWithContext } from "../common/request-context";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { clearSessionCookie, sessionCookieName, sessionCookieOptions } from "./session-cookie";

@ApiTags("auth")
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get("auth/csrf")
  csrf(): { ready: true } {
    return { ready: true };
  }

  @Public()
  @Post("auth/register")
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(dto, request);
    response.cookie(sessionCookieName(), result.token, sessionCookieOptions(result.maxAgeMs));
    return { user: result.user };
  }

  @Public()
  @Post("auth/login")
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto, request);
    response.cookie(sessionCookieName(), result.token, sessionCookieOptions(result.maxAgeMs));
    return { user: result.user };
  }

  @Post("auth/logout")
  async logout(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    await this.auth.logout(request.sessionId);
    clearSessionCookie(response);
    return { success: true };
  }

  @Get("users/me")
  me(@CurrentUser() user: AuthenticatedUser): { user: AuthenticatedUser } {
    return { user };
  }
}
