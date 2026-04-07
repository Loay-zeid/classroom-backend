import { Router } from "express";
import { and, asc, desc, eq, getTableColumns, ilike, or, sql, type SQLWrapper } from "drizzle-orm";
import { randomUUID } from "crypto";
import { roleEnum, user } from "../db/schema/index.js";
import { account, session } from "../db/schema/auth.js";
import { classes } from "../db/schema/app.js";
import { index as db } from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/authorize.js";

const router = Router();
const allowedRoles = roleEnum.enumValues;
const isRole = (value: string): value is (typeof allowedRoles)[number] =>
  allowedRoles.includes(value as (typeof allowedRoles)[number]);

// get all users with optional search filtering and pagination
router.get("/", async (req, res) => {
  if (!requireRole(req, res, ["admin", "teacher"])) return;
  try {
    const { search, role, sortBy, order, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
      );
    }

    if (req.user?.role === "teacher") {
      filterConditions.push(eq(user.role, "student"));
    } else if (typeof role === "string") {
      if (!isRole(role)) {
        res.status(400).json({ error: "Invalid role filter." });
        return;
      }

      filterConditions.push(eq(user.role, role));
    }

    const whereConditions =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereConditions);

    const totalCount = countResult[0]?.count ?? 0;

    const sortField = typeof sortBy === "string" ? sortBy : "createdAt";
    const sortDirection = order === "asc" ? asc : desc;

    const sortColumnMap: Record<string, SQLWrapper> = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    const orderByColumn: SQLWrapper =
      sortColumnMap[sortField] ?? user.createdAt;

    const usersList = await db
      .select({
        ...getTableColumns(user),
      })
      .from(user)
      .where(whereConditions)
      .orderBy(sortDirection(orderByColumn))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.error(`Get/users error: ${e}`);
    res.status(500).json({ error: "Failed to get users." });
  }
});

// get single user
router.get("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "User ID is required." });
    }
    const userId = String(id);

    const [userDetails] = await db
      .select({
        ...getTableColumns(user),
      })
      .from(user)
      .where(eq(user.id, userId));

    if (!userDetails) {
      return res.status(404).json({ error: "No user found" });
    }

    if (
      req.user?.role === "student" &&
      req.user.id &&
      req.user.id !== userId
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      req.user?.role === "teacher" &&
      userDetails.role !== "student" &&
      req.user.id !== userId
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.status(200).json({ data: userDetails });
  } catch (e) {
    console.error(`Get/users/:id error: ${e}`);
    res.status(500).json({ error: "Failed to get user." });
  }
});

// create user
router.post("/", async (req, res) => {
  if (!requireRole(req, res, ["admin"])) return;
  try {
    const { id, name, email, role } = req.body as {
      id?: string;
      name?: string;
      email?: string;
      role?: string;
    };

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required." });
    }

    if (typeof role === "string" && !isRole(role)) {
      return res.status(400).json({ error: "Invalid role." });
    }

    const [createdUser] = await db
      .insert(user)
      .values({
        id: id?.trim() ? id.trim() : randomUUID(),
        name,
        email,
        role: (role as (typeof allowedRoles)[number]) ?? "student",
        emailVerified: false,
      })
      .returning({ id: user.id });

    if (!createdUser) throw new Error("Failed to create user.");

    res.status(201).json({ data: createdUser });
  } catch (e) {
    console.error("POST /users error:", e);
    const error = e as {
      message?: string;
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      column?: string;
    };
    res.status(500).json({
      error: "Failed to create user.",
      db: {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        constraint: error?.constraint,
        table: error?.table,
        column: error?.column,
      },
    });
  }
});

const updateUser = async (req: import("express").Request, res: import("express").Response) => {
  if (!requireRole(req, res, ["admin"])) return;
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "User ID is required." });
    }
    const userId = String(id);
    const { name, email, role } = req.body as {
      name?: string;
      email?: string;
      role?: string;
    };

    if (typeof role === "string" && !isRole(role)) {
      return res.status(400).json({ error: "Invalid role." });
    }

    const updateValues: Partial<typeof user.$inferInsert> = {};
    if (name) updateValues.name = name;
    if (email) updateValues.email = email;
    if (role) updateValues.role = role as (typeof allowedRoles)[number];

    if (Object.keys(updateValues).length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    const [updatedUser] = await db
      .update(user)
      .set(updateValues)
      .where(eq(user.id, userId))
      .returning({ id: user.id });

    if (!updatedUser) {
      return res.status(404).json({ error: "No user found" });
    }

    res.status(200).json({ data: updatedUser });
  } catch (e) {
    console.error(`Update /users/:id error: ${e}`);
    res.status(500).json({ error: "Failed to update user." });
  }
};

// update user
router.put("/:id", updateUser);
router.patch("/:id", updateUser);

// delete user
router.delete("/:id", async (req, res) => {
  if (!requireRole(req, res, ["admin"])) return;
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "User ID is required." });
    }
    const userId = String(id);

    const [targetUser] = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, userId));

    if (!targetUser) {
      return res.status(404).json({ error: "No user found" });
    }

    if (targetUser.role === "teacher") {
      const [classRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(classes)
        .where(eq(classes.teacherId, userId));
      if ((classRow?.count ?? 0) > 0) {
        return res.status(409).json({
          error: "Cannot delete teacher with assigned classes.",
        });
      }
    }

    await db.delete(session).where(eq(session.userId, userId));
    await db.delete(account).where(eq(account.userId, userId));

    const [deletedUser] = await db
      .delete(user)
      .where(eq(user.id, userId))
      .returning({ id: user.id });

    if (!deletedUser) {
      return res.status(404).json({ error: "No user found" });
    }

    res.status(200).json({ data: deletedUser });
  } catch (e) {
    console.error(`DELETE /users/:id error: ${e}`);
    const error = e as { code?: string; detail?: string };
    if (error?.code === "23503") {
      return res.status(409).json({
        error: "Cannot delete user because it is referenced by other records.",
      });
    }
    res.status(500).json({ error: "Failed to delete user." });
  }
});

export default router;
