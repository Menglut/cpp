import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_COOKIE = "cppstudy_csrf";

function equalToken(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function csrfMiddleware(request: Request, response: Response, next: NextFunction): void {
  let cookieToken = request.cookies?.[CSRF_COOKIE] as string | undefined;
  if (!cookieToken) {
    cookieToken = randomBytes(24).toString("base64url");
    response.cookie(CSRF_COOKIE, cookieToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  if (SAFE_METHODS.has(request.method)) {
    next();
    return;
  }

  const expectedOrigin = process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000";
  const origin = request.header("origin");
  const headerToken = request.header("x-csrf-token");
  if (origin !== expectedOrigin || !equalToken(cookieToken, headerToken)) {
    response.status(403).json({
      error: {
        code: "CSRF_REJECTED",
        message: "요청 출처 또는 CSRF 토큰을 확인할 수 없습니다.",
        requestId: (request as RequestWithRequestId).requestId,
      },
    });
    return;
  }
  next();
}

type RequestWithRequestId = Request & { requestId?: string };
