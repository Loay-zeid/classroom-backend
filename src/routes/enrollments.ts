import { Router } from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { index as db } from "../db/index.js";
import { classes, enrollments, user } from "../db/schema/index.js";
import { isStudent, requireAuth } from "../middleware/authorize.js";

const router = Router();

// get all enrollments with optional search filtering and pagination
router.get("/", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const { search, classId, studentId, page = 1, limit = 10 } = req.query;

    if (isStudent(req)) {
      if (studentId && String(studentId) !== req.user?.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(user.name, `%${search}%`),
          ilike(user.email, `%${search}%`),
          ilike(classes.name, `%${search}%`)
        )
      );
    }

    if (classId) {
      const parsedClassId = Number(classId);
      if (!Number.isNaN(parsedClassId)) {
        filterConditions.push(eq(enrollments.classId, parsedClassId));
      }
    }

    if (studentId) {
      filterConditions.push(eq(enrollments.studentId, String(studentId)));
    } else if (isStudent(req) && req.user?.id) {
      filterConditions.push(eq(enrollments.studentId, req.user.id));
    }

    const whereConditions =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .where(whereConditions);

    const totalCount = countResult[0]?.count ?? 0;

    const enrollmentList = await db
      .select({
        ...getTableColumns(enrollments),
        student: { ...getTableColumns(user) },
        class: { ...getTableColumns(classes) },
      })
      .from(enrollments)
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .where(whereConditions)
      .orderBy(desc(enrollments.created_at))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: enrollmentList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.error(`Get/enrollments error: ${e}`);
    res.status(500).json({ error: "Failed to get enrollments." });
  }
});

export default router;
