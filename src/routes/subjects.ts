import { Router } from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { departments, subjects } from "../db/schema";
import { index as db } from "../db";

const router = Router();
// get all subjects with optional search filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

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

    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        departments: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereConditions)
      .orderBy(desc(subjects.created_at))
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
export default router;
