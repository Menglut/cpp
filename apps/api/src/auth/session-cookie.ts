import type { CookieOptions, Response } from "express";

export function sessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME ?? "cppstudy_session";
}

export function sessionCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(sessionCookieName(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
