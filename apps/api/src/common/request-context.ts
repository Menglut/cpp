import type { Request } from "express";
import type { Role } from "../generated/prisma/enums";

export type AuthenticatedUser = {
  id: string;
  email: string;
  nickname: string;
  role: Role;
};

export type RequestWithContext = Request & {
  requestId: string;
  user?: AuthenticatedUser;
  sessionId?: string;
};
