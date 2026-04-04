import { Router } from "express";
import { and, asc, desc, eq, getTableColumns, ilike, or, sql, type SQLWrapper } from "drizzle-orm";
import { index as db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";

const router = Router();

// get all classes with optional search filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { search, subject, subjectId, teacher, sortBy, order, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(classes.name, `%${search}%`),
          ilike(classes.inviteCode, `%${search}%`)
        )
      );
    }

    if (subject) {
      filterConditions.push(ilike(subjects.name, `%${subject}%`));
    }

    if (subjectId) {
      const parsedSubjectId = Number(subjectId);
      if (!Number.isNaN(parsedSubjectId)) {
        filterConditions.push(eq(classes.subjectId, parsedSubjectId));
      }
    }

    if (teacher) {
      filterConditions.push(ilike(user.name, `%${teacher}%`));
    }

    const whereConditions =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereConditions);

    const totalCount = countResult[0]?.count ?? 0;

    const sortField = typeof sortBy === "string" ? sortBy : "createdAt";
    const sortDirection = order === "asc" ? asc : desc;

    const sortColumnMap: Record<string, SQLWrapper> = {
      name: classes.name,
      status: classes.status,
      capacity: classes.capacity,
      createdAt: classes.created_at,
    };

    const orderByColumn: SQLWrapper =
      sortColumnMap[sortField] ?? classes.created_at;

    const classesList = await db
      .select({
        ...getTableColumns(classes),
        subject: { ...getTableColumns(subjects) },
        teacher: { ...getTableColumns(user) },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereConditions)
      .orderBy(sortDirection(orderByColumn))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.error(`Get/classes error: ${e}`);
    res.status(500).json({ error: "Failed to get classes." });
  }
});

const getClassCapacity = async (classId: number) => {
  const [row] = await db
    .select({ id: classes.id, capacity: classes.capacity })
    .from(classes)
    .where(eq(classes.id, classId));
  return row ?? null;
};

const ensureStudentExists = async (studentId: string) => {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, studentId), eq(user.role, "student")));
  return row ?? null;
};

const countEnrollments = async (classId: number) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.classId, classId));
  return row?.count ?? 0;
};

const enrollStudent = async (classId: number, studentId: string) => {
  const classRow = await getClassCapacity(classId);
  if (!classRow) {
    return { status: 404, body: { error: "No class found" } };
  }

  const studentRow = await ensureStudentExists(studentId);
  if (!studentRow) {
    return { status: 404, body: { error: "Student not found" } };
  }

  const totalEnrollments = await countEnrollments(classId);
  if (totalEnrollments >= classRow.capacity) {
    return {
      status: 400,
      body: { error: "Class is at full capacity." },
    };
  }

  try {
    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({
        classId,
        studentId,
      })
      .returning({ id: enrollments.id });

    return { status: 201, body: { data: createdEnrollment } };
  } catch (e) {
    const error = e as { code?: string };
    if (error?.code === "23505") {
      return {
        status: 409,
        body: { error: "Student already enrolled." },
      };
    }
    throw e;
  }
};

// join class via invite code
router.post("/join", async (req, res) => {
  try {
    const { inviteCode, studentId } = req.body as {
      inviteCode?: string;
      studentId?: string;
    };

    if (!inviteCode || !studentId) {
      return res.status(400).json({
        error: "Invite code and student ID are required.",
      });
    }

    const [classRow] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.inviteCode, inviteCode.trim()));

    if (!classRow) {
      return res.status(404).json({ error: "Invalid invite code." });
    }

    const result = await enrollStudent(classRow.id, studentId);
    return res.status(result.status).json(result.body);
  } catch (e) {
    console.error("POST /classes/join error:", e);
    res.status(500).json({ error: "Failed to join class." });
  }
});

// Get class details with teacher, subject, and department
router.get("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) {
      return res.status(404).json({ error: "No class found" });
    }

    const [classDetails] = await db
      .select({
        ...getTableColumns(classes),
        subject: { ...getTableColumns(subjects) },
        department: { ...getTableColumns(departments) },
        teacher: { ...getTableColumns(user) },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(classes.id, classId));

    if (!classDetails) {
      return res.status(404).json({ error: "No class found" });
    }

    res.status(200).json({ data: classDetails });
  } catch (e) {
    console.error(`Get/classes/:id error: ${e}`);
    res.status(500).json({ error: "Failed to get class." });
  }
});

// list enrollments for a class
router.get("/:id/enrollments", async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) {
      return res.status(404).json({ error: "No class found" });
    }

    const enrollmentList = await db
      .select({
        ...getTableColumns(enrollments),
        student: { ...getTableColumns(user) },
      })
      .from(enrollments)
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(eq(enrollments.classId, classId))
      .orderBy(desc(enrollments.created_at));

    res.status(200).json({ data: enrollmentList });
  } catch (e) {
    console.error(`Get/classes/:id/enrollments error: ${e}`);
    res.status(500).json({ error: "Failed to get enrollments." });
  }
});

// enroll student in class
router.post("/:id/enrollments", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const { studentId } = req.body as { studentId?: string };

    if (!Number.isFinite(classId)) {
      return res.status(404).json({ error: "No class found" });
    }

    if (!studentId) {
      return res.status(400).json({ error: "Student ID is required." });
    }

    const result = await enrollStudent(classId, studentId);
    return res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`POST /classes/:id/enrollments error: ${e}`);
    res.status(500).json({ error: "Failed to enroll student." });
  }
});

// unenroll student from class
router.delete("/:id/enrollments/:studentId", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const { studentId } = req.params;

    if (!Number.isFinite(classId)) {
      return res.status(404).json({ error: "No class found" });
    }

    const [deletedEnrollment] = await db
      .delete(enrollments)
      .where(
        and(
          eq(enrollments.classId, classId),
          eq(enrollments.studentId, studentId)
        )
      )
      .returning({ id: enrollments.id });

    if (!deletedEnrollment) {
      return res.status(404).json({ error: "Enrollment not found." });
    }

    res.status(200).json({ data: deletedEnrollment });
  } catch (e) {
    console.error(`DELETE /classes/:id/enrollments/:studentId error: ${e}`);
    res.status(500).json({ error: "Failed to unenroll student." });
  }
});

router.post("/", async (req, res) => {
  try {
    const [createdClass] = await db
      .insert(classes)
      .values({
        ...req.body,
        inviteCode: Math.random().toString(36).substring(2, 9),
        schedules: req.body?.schedules ?? [],
      })
      .returning({ id: classes.id });

    if (!createdClass) throw new Error("Failed to create class.");

    res.status(201).json({ data: createdClass });
  } catch (e) {
    console.error("POST /classes error:", e);
    const error = e as {
      message?: string;
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      column?: string;
    };
    res.status(500).json({
      error: "Failed to create class.",
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

const updateClass = async (
  req: import("express").Request,
  res: import("express").Response
) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) {
      return res.status(404).json({ error: "No class found" });
    }

    const {
      name,
      subjectId,
      teacherId,
      capacity,
      status,
      description,
      bannerUrl,
      bannerCldPubId,
      schedules,
    } = req.body as {
      name?: string;
      subjectId?: number;
      teacherId?: string;
      capacity?: number;
      status?: string;
      description?: string;
      bannerUrl?: string;
      bannerCldPubId?: string;
      schedules?: unknown;
    };

    if (!name || !subjectId || !teacherId || !capacity) {
      return res.status(400).json({
        error: "Name, subject, teacher, and capacity are required.",
      });
    }

    const normalizedStatus: "active" | "inactive" | "archived" =
      status === "inactive" || status === "archived" ? status : "active";

    const [updatedClass] = await db
      .update(classes)
      .set({
        name: name.trim(),
        subjectId,
        teacherId,
        capacity,
        status: normalizedStatus,
        description: description ?? "",
        bannerUrl: bannerUrl ?? null,
        bannerCldPubId: bannerCldPubId ?? null,
        schedules: Array.isArray(schedules) ? schedules : [],
      })
      .where(eq(classes.id, classId))
      .returning({ id: classes.id });

    if (!updatedClass) {
      return res.status(404).json({ error: "No class found" });
    }

    res.status(200).json({ data: updatedClass });
  } catch (e) {
    console.error(`Update /classes/:id error: ${e}`);
    res.status(500).json({ error: "Failed to update class." });
  }
};

router.put("/:id", updateClass);
router.patch("/:id", updateClass);

// delete class
router.delete("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) {
      return res.status(404).json({ error: "No class found" });
    }

    const [deletedClass] = await db
      .delete(classes)
      .where(eq(classes.id, classId))
      .returning({ id: classes.id });

    if (!deletedClass) {
      return res.status(404).json({ error: "No class found" });
    }

    res.status(200).json({ data: deletedClass });
  } catch (e) {
    console.error(`DELETE /classes/:id error: ${e}`);
    res.status(500).json({ error: "Failed to delete class." });
  }
});


export default router;
