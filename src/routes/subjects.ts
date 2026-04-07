import { Router } from "express";
import { and, asc, desc, eq, getTableColumns, ilike, or, sql, type SQLWrapper } from "drizzle-orm";
import { departments, subjects } from "../db/schema/index.js";
import { index as db } from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/authorize.js";

const router = Router();
// get all subjects with optional search filtering and pagination
router.get("/", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const { search, department, departmentId, sortBy, order, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${search}%`),
          ilike(subjects.code, `%${search}%`)
        )
      );
    }

    if (departmentId) {
      const parsedDepartmentId = Number(departmentId);
      if (!Number.isNaN(parsedDepartmentId)) {
        filterConditions.push(eq(subjects.departmentId, parsedDepartmentId));
      }
    }

    if (department) {
      filterConditions.push(ilike(departments.name, `%${department}%`));
    }

    const whereConditions =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereConditions);

    const totalCount = countResult[0]?.count ?? 0;

    const sortField = typeof sortBy === "string" ? sortBy : "createdAt";
    const sortDirection = order === "asc" ? asc : desc;

    const sortColumnMap: Record<string, SQLWrapper> = {
      name: subjects.name,
      createdAt: subjects.created_at,
      department: departments.name,
    };

    const orderByColumn: SQLWrapper =
      sortColumnMap[sortField] ?? subjects.created_at;

    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        departments: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereConditions)
      .orderBy(sortDirection(orderByColumn))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.error(`Get/subjects error: ${e}`);
    res.status(500).json({ error: "Failed to get subjects." });
  }
});

// get single subject
router.get("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const subjectId = Number(req.params.id);

    if (!Number.isFinite(subjectId)) {
      return res.status(404).json({ error: "No subject found" });
    }

    const [subjectDetails] = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(subjects.id, subjectId));

    if (!subjectDetails) {
      return res.status(404).json({ error: "No subject found" });
    }

    res.status(200).json({ data: subjectDetails });
  } catch (e) {
    console.error(`Get/subjects/:id error: ${e}`);
    res.status(500).json({ error: "Failed to get subject." });
  }
});

// create subject
router.post("/", async (req, res) => {
  if (!requireRole(req, res, ["admin", "teacher"])) return;
  try {
    const { name, departmentId } = req.body as {
      name?: string;
      departmentId?: number;
    };

    if (!name || !departmentId) {
      return res.status(400).json({ error: "Name and department are required." });
    }

    const [createdSubject] = await db
      .insert(subjects)
      .values({
        name: name.trim(),
        departmentId,
        code: `SUB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        description: "",
      })
      .returning({ id: subjects.id });

    if (!createdSubject) throw new Error("Failed to create subject.");

    res.status(201).json({ data: createdSubject });
  } catch (e) {
    console.error("POST /subjects error:", e);
    const error = e as {
      message?: string;
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      column?: string;
    };
    res.status(500).json({
      error: "Failed to create subject.",
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

const updateSubject = async (
  req: import("express").Request,
  res: import("express").Response
) => {
  if (!requireRole(req, res, ["admin", "teacher"])) return;
  try {
    const subjectId = Number(req.params.id);
    const { name, departmentId } = req.body as {
      name?: string;
      departmentId?: number;
    };

    if (!Number.isFinite(subjectId)) {
      return res.status(404).json({ error: "No subject found" });
    }

    if (!name || !departmentId) {
      return res.status(400).json({ error: "Name and department are required." });
    }

    const [updatedSubject] = await db
      .update(subjects)
      .set({
        name: name.trim(),
        departmentId,
      })
      .where(eq(subjects.id, subjectId))
      .returning({ id: subjects.id });

    if (!updatedSubject) {
      return res.status(404).json({ error: "No subject found" });
    }

    res.status(200).json({ data: updatedSubject });
  } catch (e) {
    console.error(`Update /subjects/:id error: ${e}`);
    res.status(500).json({ error: "Failed to update subject." });
  }
};

router.put("/:id", updateSubject);
router.patch("/:id", updateSubject);

// delete subject
router.delete("/:id", async (req, res) => {
  if (!requireRole(req, res, ["admin", "teacher"])) return;
  try {
    const subjectId = Number(req.params.id);

    if (!Number.isFinite(subjectId)) {
      return res.status(404).json({ error: "No subject found" });
    }

    const [deletedSubject] = await db
      .delete(subjects)
      .where(eq(subjects.id, subjectId))
      .returning({ id: subjects.id });

    if (!deletedSubject) {
      return res.status(404).json({ error: "No subject found" });
    }

    res.status(200).json({ data: deletedSubject });
  } catch (e) {
    console.error(`DELETE /subjects/:id error: ${e}`);
    res.status(500).json({ error: "Failed to delete subject." });
  }
});

export default router;
