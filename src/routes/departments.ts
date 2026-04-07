import { Router } from "express";
import { and, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { classes, departments, enrollments, subjects } from "../db/schema/index.js";
import { index as db } from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/authorize.js";

const router = Router();

// get all departments with subject totals and pagination
router.get("/", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];
    if (search) {
      filterConditions.push(ilike(departments.name, `%${search}%`));
    }

    const whereConditions =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(departments)
      .where(whereConditions);

    const totalCount = countResult[0]?.count ?? 0;

    const departmentList = await db
      .select({
        ...getTableColumns(departments),
        subjectsCount: sql<number>`count(${subjects.id})`,
      })
      .from(departments)
      .leftJoin(subjects, eq(subjects.departmentId, departments.id))
      .where(whereConditions)
      .groupBy(departments.id)
      .orderBy(desc(departments.created_at))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: departmentList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.error(`Get/departments error: ${e}`);
    res.status(500).json({ error: "Failed to get departments." });
  }
});

// get single department
router.get("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const departmentId = Number(req.params.id);

    if (!Number.isFinite(departmentId)) {
      return res.status(404).json({ error: "No department found" });
    }

    const [departmentDetails] = await db
      .select({
        ...getTableColumns(departments),
        subjectsCount: sql<number>`count(distinct ${subjects.id})`,
        classesCount: sql<number>`count(distinct ${classes.id})`,
        enrollmentsCount: sql<number>`count(distinct ${enrollments.id})`,
      })
      .from(departments)
      .leftJoin(subjects, eq(subjects.departmentId, departments.id))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(eq(departments.id, departmentId))
      .groupBy(departments.id);

    if (!departmentDetails) {
      return res.status(404).json({ error: "No department found" });
    }

    res.status(200).json({ data: departmentDetails });
  } catch (e) {
    console.error(`Get/departments/:id error: ${e}`);
    res.status(500).json({ error: "Failed to get department." });
  }
});

// create department
router.post("/", async (req, res) => {
  if (!requireRole(req, res, ["admin"])) return;
  try {
    const { name, code, description } = req.body as {
      name?: string;
      code?: string;
      description?: string;
    };

    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required." });
    }

    const normalizedName = name.trim();
    const normalizedCode = code.trim();

    if (!normalizedName || !normalizedCode) {
      return res.status(400).json({ error: "Name and code are required." });
    }

    const [existingDepartment] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.code, normalizedCode))
      .limit(1);

    if (existingDepartment) {
      return res.status(409).json({ error: "Department code already exists." });
    }

    const [createdDepartment] = await db
      .insert(departments)
      .values({
        name: normalizedName,
        code: normalizedCode,
        description: description?.trim() ? description.trim() : null,
      })
      .returning({ id: departments.id });

    if (!createdDepartment) throw new Error("Failed to create department.");

    res.status(201).json({ data: createdDepartment });
  } catch (e) {
    console.error("POST /departments error:", e);
    const error = e as {
      message?: string;
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      column?: string;
    };
    res.status(500).json({
      error: "Failed to create department.",
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

const updateDepartment = async (
  req: import("express").Request,
  res: import("express").Response
) => {
  if (!requireRole(req, res, ["admin"])) return;
  try {
    const departmentId = Number(req.params.id);
    const { name, code, description } = req.body as {
      name?: string;
      code?: string;
      description?: string;
    };

    if (!Number.isFinite(departmentId)) {
      return res.status(404).json({ error: "No department found" });
    }

    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required." });
    }

    const normalizedName = name.trim();
    const normalizedCode = code.trim();

    if (!normalizedName || !normalizedCode) {
      return res.status(400).json({ error: "Name and code are required." });
    }

    const [updatedDepartment] = await db
      .update(departments)
      .set({
        name: normalizedName,
        code: normalizedCode,
        description: description?.trim() ? description.trim() : null,
      })
      .where(eq(departments.id, departmentId))
      .returning({ id: departments.id });

    if (!updatedDepartment) {
      return res.status(404).json({ error: "No department found" });
    }

    res.status(200).json({ data: updatedDepartment });
  } catch (e) {
    console.error(`Update /departments/:id error: ${e}`);
    res.status(500).json({ error: "Failed to update department." });
  }
};

router.put("/:id", updateDepartment);
router.patch("/:id", updateDepartment);

// delete department
router.delete("/:id", async (req, res) => {
  if (!requireRole(req, res, ["admin"])) return;
  try {
    const departmentId = Number(req.params.id);

    if (!Number.isFinite(departmentId)) {
      return res.status(404).json({ error: "No department found" });
    }

    const [deletedDepartment] = await db
      .delete(departments)
      .where(eq(departments.id, departmentId))
      .returning({ id: departments.id });

    if (!deletedDepartment) {
      return res.status(404).json({ error: "No department found" });
    }

    res.status(200).json({ data: deletedDepartment });
  } catch (e) {
    console.error(`DELETE /departments/:id error: ${e}`);
    res.status(500).json({ error: "Failed to delete department." });
  }
});

export default router;
