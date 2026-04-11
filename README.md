# 🏫 Classroom Management System — Backend API

> A scalable, production-ready REST API for a full-stack Classroom Management System, similar to Google Classroom. Built with **Node.js**, **TypeScript**, and **Express**, with role-based access control and secure authentication.

---

## 🌐 Live Demo

🔗 Frontend: [https://classroom-frontend-liart.vercel.app](https://classroom-frontend-liart.vercel.app)  
🔗 Frontend Repo: [classroomFrontend](https://github.com/Loay-zeid/classroomFrontend)

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle ORM |
| Auth | JWT (JSON Web Tokens) |
| Media Upload | Cloudinary |
| Architecture | Modular MVC (Controllers / Services / Routes / Middleware) |

---

## 🚀 Features

- ✅ **Role-Based Access Control** — Admin, Teacher, Student with separate permissions
- ✅ **JWT Authentication** — Secure registration, login & session management
- ✅ **Join-Code System** — Unique codes for students to join specific classes
- ✅ **Full CRUD** — Departments, Classes, Subjects, Users, Enrollments
- ✅ **Cloudinary Integration** — Image & media file uploads
- ✅ **Input Validation** — Request validation across all routes
- ✅ **Protected Routes** — Auth + role guard middleware on every endpoint
- ✅ **Modular Architecture** — Scalable and maintainable codebase structure
- ✅ **Environment-Based Config** — All sensitive data managed via `.env`

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| 🔴 **Admin** | Full system control — manage users, departments, classes, subjects, enrollments |
| 🟡 **Teacher** | Manage assigned classes & subjects, view enrolled students |
| 🟢 **Student** | Join classes via code, view assigned content |

---

## 📁 Project Structure

```
src/
├── controllers/        # Business logic per resource
├── routes/             # Express route definitions
├── services/           # Reusable service layer
├── middleware/         # Auth guard, role guard, validation
├── db/
│   ├── schema/         # Drizzle ORM schema definitions
│   └── index.ts        # Database connection (Neon / PostgreSQL)
├── utils/              # Helper functions & utilities
├── config/             # Environment & app configuration
└── index.ts            # Entry point
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js >= 18.x
- PostgreSQL database (or [Neon](https://neon.tech) serverless)
- Cloudinary account

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Loay-zeid/classroom-backend.git
cd classroom-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your values

# 4. Push database schema
npm run db:push

# 5. Start development server
npm run dev
```

---

## 🔐 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database (Neon / PostgreSQL)
DATABASE_URL=your_neon_postgres_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend (CORS)
CLIENT_URL=https://classroom-frontend-liart.vercel.app
```

> ⚠️ Never commit your real `.env` file. Always use `.env.example` for sharing variable names.

---

## 📡 API Endpoints

### 🔑 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login & receive JWT | ❌ |
| `GET` | `/api/auth/me` | Get current user info | ✅ |

---

### 👤 Users

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/api/users` | Get all users | Admin |
| `GET` | `/api/users/:id` | Get user by ID | Admin |
| `PUT` | `/api/users/:id` | Update user | Admin |
| `DELETE` | `/api/users/:id` | Delete user | Admin |

---

### 🏢 Departments

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/api/departments` | Get all departments | ✅ All |
| `POST` | `/api/departments` | Create department | Admin |
| `PUT` | `/api/departments/:id` | Update department | Admin |
| `DELETE` | `/api/departments/:id` | Delete department | Admin |

---

### 🏫 Classes

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/api/classes` | Get all classes | ✅ All |
| `GET` | `/api/classes/:id` | Get class by ID | ✅ All |
| `POST` | `/api/classes` | Create class | Admin |
| `PUT` | `/api/classes/:id` | Update class | Admin / Teacher |
| `DELETE` | `/api/classes/:id` | Delete class | Admin |
| `POST` | `/api/classes/:id/join` | Join class via code | Student |
| `GET` | `/api/classes/:id/join-code` | Get join code | Admin / Teacher |

---

### 📚 Subjects

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/api/subjects` | Get all subjects | ✅ All |
| `GET` | `/api/subjects/:id` | Get subject by ID | ✅ All |
| `POST` | `/api/subjects` | Create subject | Admin / Teacher |
| `PUT` | `/api/subjects/:id` | Update subject | Admin / Teacher |
| `DELETE` | `/api/subjects/:id` | Delete subject | Admin |

---

### 📋 Enrollments

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/api/enrollments` | Get all enrollments | Admin |
| `GET` | `/api/enrollments/my` | Get my enrollments | Student |
| `POST` | `/api/enrollments` | Enroll student manually | Admin |
| `DELETE` | `/api/enrollments/:id` | Remove enrollment | Admin |

---

## 🗄️ Database Schema

```
Users
 ├── id, name, email, password
 ├── roleId → Roles
 └── profileImage (Cloudinary URL)

Roles
 └── id, name (admin | teacher | student)

Departments
 ├── id, name, description
 └── → contains many Classes

Classes
 ├── id, name, joinCode (unique)
 ├── departmentId → Departments
 ├── teacherId → Users
 └── → contains many Subjects

Subjects
 ├── id, name, description
 └── classId → Classes

Enrollments
 ├── id
 ├── studentId → Users
 └── classId → Classes
```

---

## 🛡️ Role & Permission Matrix

| Action | Admin | Teacher | Student |
|--------|:-----:|:-------:|:-------:|
| Manage users | ✅ | ❌ | ❌ |
| Manage departments | ✅ | ❌ | ❌ |
| Create / delete classes | ✅ | ❌ | ❌ |
| Manage class content | ✅ | ✅ | ❌ |
| Generate join code | ✅ | ✅ | ❌ |
| Join class via code | ❌ | ❌ | ✅ |
| View own enrollments | ✅ | ✅ | ✅ |
| Upload media | ✅ | ✅ | ✅ |

---

## 🔄 Request Lifecycle

```
Incoming Request
      ↓
Auth Middleware  (verify JWT token)
      ↓
Role Guard      (check user role & permissions)
      ↓
Validation      (validate request body/params)
      ↓
Controller      (handle request logic)
      ↓
Service Layer   (business logic)
      ↓
Drizzle ORM     (query PostgreSQL / Neon)
      ↓
JSON Response
```

---

## 🔒 Security Practices

- All passwords are hashed before storing
- JWT tokens are signed with a secret key and expire after a set duration
- Role-based middleware prevents unauthorized access at route level
- Sensitive credentials stored in environment variables only
- CORS configured to allow only the frontend domain

---

## 📦 Available Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Compile TypeScript to JavaScript
npm run start      # Run compiled production build
npm run db:push    # Push Drizzle schema to database
npm run db:studio  # Open Drizzle Studio (DB GUI)
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
