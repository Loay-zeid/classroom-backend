# 🏫 Classroom Management System — Backend API

## 📌 Overview

This is the **REST API backend** for the Classroom Management System.
It handles authentication, role-based access control, and full CRUD operations for all system entities including Users, Departments, Classes, Subjects, and Enrollments.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| ORM | Mongoose |
| Auth | JWT (JSON Web Tokens) |
| Media Upload | Cloudinary |
| Validation | Express Validator / Joi |
| Deployment | Railway / Render |

---

## 🚀 Features

- ✅ JWT-based Authentication & Authorization
- ✅ Role-Based Access Control (Admin / Instructor / Student)
- ✅ Full CRUD for Departments, Classes, Subjects, Users, Enrollments
- ✅ Cloudinary Integration for profile image uploads
- ✅ Input Validation & Centralized Error Handling
- ✅ Protected Routes with Middleware
- ✅ RESTful API Design

---

## 📁 Project Structure

```
src/
├── controllers/        # Request handlers for each resource
├── models/             # Mongoose schemas & models
├── routes/             # Express route definitions
├── middleware/         # Auth, role guard, validation middleware
├── utils/              # Helper functions & utilities
├── config/             # DB connection & environment config
└── index.ts            # App entry point
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/classroom-backend.git
cd classroom-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your values in .env

# 4. Run the development server
npm run dev
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL (for CORS)
CLIENT_URL=https://classroom-frontend-liart.vercel.app
```

> ⚠️ Never commit your real `.env` file. Use `.env.example` for sharing variable names only.

---

## 📡 API Endpoints

### 🔑 Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login & receive JWT token | ❌ |
| `GET` | `/api/auth/me` | Get current logged-in user | ✅ |

---

### 👤 Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/users` | Get all users | Admin |
| `GET` | `/api/users/:id` | Get user by ID | Admin |
| `PUT` | `/api/users/:id` | Update user info | Admin |
| `DELETE` | `/api/users/:id` | Delete user | Admin |

---

### 🏢 Departments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/departments` | Get all departments | ✅ |
| `POST` | `/api/departments` | Create new department | Admin |
| `PUT` | `/api/departments/:id` | Update department | Admin |
| `DELETE` | `/api/departments/:id` | Delete department | Admin |

---

### 🏫 Classes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/classes` | Get all classes | ✅ |
| `POST` | `/api/classes` | Create new class | Admin |
| `PUT` | `/api/classes/:id` | Update class | Admin |
| `DELETE` | `/api/classes/:id` | Delete class | Admin |

---

### 📚 Subjects

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/subjects` | Get all subjects | ✅ |
| `GET` | `/api/subjects/:id` | Get subject by ID | ✅ |
| `POST` | `/api/subjects` | Create new subject | Admin / Instructor |
| `PUT` | `/api/subjects/:id` | Update subject | Admin / Instructor |
| `DELETE` | `/api/subjects/:id` | Delete subject | Admin |

---

### 📋 Enrollments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/enrollments` | Get all enrollments | Admin |
| `POST` | `/api/enrollments` | Enroll student in class | Admin / Instructor |
| `DELETE` | `/api/enrollments/:id` | Remove enrollment | Admin |

---

## 🛡️ Role & Permission Matrix

| Action | Admin | Instructor | Student |
|--------|:-----:|:----------:|:-------:|
| Manage users | ✅ | ❌ | ❌ |
| Manage departments | ✅ | ❌ | ❌ |
| Manage classes | ✅ | ✅ | ❌ |
| Manage subjects | ✅ | ✅ | ❌ |
| View enrollments | ✅ | ✅ | Own only |
| Upload media | ✅ | ✅ | ✅ |

---

## 🗄️ Database Schema

```
User
 ├── name, email, password
 ├── role: (admin | instructor | student)
 └── profileImage (Cloudinary URL)

Department
 ├── name
 └── description

Class
 ├── name
 ├── department → Department
 └── instructor → User

Subject
 ├── name
 ├── description
 └── class → Class

Enrollment
 ├── student → User
 └── class → Class
```

---

## 🌐 Live API

> 🔗 Base URL: `https://your-backend-url.railway.app/api`

---

## 🔗 Related Repositories

- 🎨 **Frontend Repo:** [classroom-frontend](https://github.com/Loay-zeid/classroomFrontend)
- 🌍 **Live Demo:** [https://classroom-frontend-liart.vercel.app](https://classroom-frontend-liart.vercel.app)

---

## 🧠 Summary Flow

```
Client Request → Auth Middleware → Role Guard → Controller → Model → MongoDB → Response
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
