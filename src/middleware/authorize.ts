import type { Request, Response } from "express";

export type AppRole = "admin" | "teacher" | "student";

export const requireAuth = (req: Request, res: Response): boolean => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
};

export const requireRole = (
  req: Request,
  res: Response,
  roles: AppRole[]
): boolean => {
  if (!requireAuth(req, res)) return false;
  if (!req.user?.role || !roles.includes(req.user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
};

export const isAdmin = (req: Request): boolean => req.user?.role === "admin";
export const isTeacher = (req: Request): boolean => req.user?.role === "teacher";
export const isStudent = (req: Request): boolean => req.user?.role === "student";
