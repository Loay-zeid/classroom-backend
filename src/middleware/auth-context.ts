import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";

const isAppRole = (
  role: string | undefined
): role is "admin" | "teacher" | "student" =>
  role === "admin" || role === "teacher" || role === "student";

const buildAuthHeaders = (req: Request) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(","));
    }
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  return headers;
};

const attachAuthContext = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.headers.cookie) {
    return next();
  }

  try {
    const origin = `${req.protocol}://${req.get("host")}`;
    const headers = buildAuthHeaders(req);
    headers.set("origin", origin);

    const request = new Request(`${origin}/api/auth/get-session`, {
      method: "GET",
      headers,
    });

    const response = await auth.handler(request);
    if (!response.ok) {
      return next();
    }

    const payload = (await response.json().catch(() => null)) as
      | { user?: { id?: string; role?: string; email?: string; name?: string } }
      | null;

    if (payload?.user && typeof payload.user === "object") {
      const user: NonNullable<Request["user"]> = {};

      if (payload.user.id) {
        user.id = payload.user.id;
      }
      if (isAppRole(payload.user.role)) {
        user.role = payload.user.role;
      }
      if (payload.user.email) {
        user.email = payload.user.email;
      }
      if (payload.user.name) {
        user.name = payload.user.name;
      }

      req.user = user;
    }
  } catch (error) {
    console.warn("attachAuthContext failed:", error);
  }

  return next();
};

export default attachAuthContext;
