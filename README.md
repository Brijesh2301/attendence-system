# 📋 Attendance + Task Management System
### Built with Node.js · Express · MongoDB · React

A production-ready full-stack web application for managing employee attendance and tasks with JWT authentication, role-based access control, and secure REST APIs.

---

## 📁 Project Structure

```
attendance-system/
├── backend/                          # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Mongoose connection
│   │   ├── models/
│   │   │   ├── User.model.js         # User schema + bcrypt hooks
│   │   │   ├── Attendance.model.js   # Attendance + unique index
│   │   │   └── Task.model.js         # Task schema + virtuals
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── attendance.controller.js
│   │   │   └── tasks.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    # JWT verify + RBAC
│   │   │   ├── validate.middleware.js
│   │   │   └── error.middleware.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   └── tasks.routes.js
│   │   ├── utils/
│   │   │   ├── jwt.utils.js
│   │   │   └── response.utils.js
│   │   └── server.js
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/                         # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js
│   │   │   └── PrivateRoute.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── SignupPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── TasksPage.js
│   │   │   └── AttendancePage.js
│   │   ├── services/
│   │   │   └── api.js               # Axios + auto token refresh
│   │   ├── App.js
│   │   └── styles.css
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml                # MongoDB + Backend + Frontend
└── README.md
```

---

## 🗄️ MongoDB Schema Design

### Collections Overview

```
attendance_system (MongoDB Database)
│
├── users
│   ├── _id: ObjectId
│   ├── name: String (required, 2–100 chars)
│   ├── email: String (required, unique, lowercase)
│   ├── password: String (bcrypt hashed, select: false)
│   ├── role: Enum ['employee', 'manager', 'admin']
│   ├── isActive: Boolean (default: true)
│   ├── refreshTokens: [{ token, expiresAt, createdAt }]
│   └── timestamps: createdAt, updatedAt
│
├── attendances
│   ├── _id: ObjectId
│   ├── user: ObjectId → ref: User
│   ├── date: String 'YYYY-MM-DD'  ← used with user for unique constraint
│   ├── checkIn: Date
│   ├── checkOut: Date
│   ├── status: Enum ['present', 'absent', 'half_day', 'leave']
│   ├── notes: String (max 500)
│   └── timestamps: createdAt, updatedAt
│
└── tasks
    ├── _id: ObjectId
    ├── title: String (required, 3–255 chars)
    ├── description: String (max 5000)
    ├── assignedTo: ObjectId → ref: User
    ├── createdBy: ObjectId → ref: User
    ├── priority: Enum ['low', 'medium', 'high', 'critical']
    ├── status: Enum ['todo', 'in_progress', 'completed', 'cancelled']
    ├── dueDate: Date
    ├── completedAt: Date (auto-set via pre-save hook)
    └── timestamps: createdAt, updatedAt
```

### Key Indexes

| Collection | Index | Type | Purpose |
|---|---|---|---|
| users | `email` | Unique | Fast login lookup, prevent duplicates |
| attendances | `{ user, date }` | **Unique Compound** | ✅ Enforce no duplicate attendance per day |
| attendances | `{ user, date: -1 }` | Regular | Fast user history queries |
| attendances | `date` | Regular | Admin date-based queries |
| tasks | `{ assignedTo, status }` | Regular | Fast task filtering |
| tasks | `{ dueDate }` | Regular | Overdue task queries |

> **No-Duplicate Attendance** is enforced at the database level via the unique compound index `{ user: 1, date: 1 }`. Even if application code has a bug, MongoDB will reject duplicate entries.

---

## 🔌 API Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register a new user |
| POST | `/auth/login` | Public | Login, receive JWT tokens |
| POST | `/auth/refresh` | Public | Rotate access + refresh token |
| POST | `/auth/logout` | Private | Revoke refresh token |
| GET | `/auth/me` | Private | Get current user profile |

#### POST /auth/signup
```json
// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass1",
  "role": "employee"
}

// Response 201
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "John Doe", "email": "john@example.com", "role": "employee" },
    "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
  }
}
```

#### POST /auth/login
```json
// Request
{ "email": "john@example.com", "password": "SecurePass1" }

// Response 200
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "John Doe", "role": "employee" },
    "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
  }
}
```

---

### Attendance Endpoints

All require `Authorization: Bearer <accessToken>` header.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/attendance/check-in` | Employee+ | Mark check-in (no duplicate per day) |
| PATCH | `/attendance/check-out` | Employee+ | Mark check-out |
| GET | `/attendance/today` | Employee+ | Today's status |
| GET | `/attendance` | Employee+ | History (filterable, paginated) |
| GET | `/attendance/stats` | Employee+ | Monthly aggregated statistics |
| GET | `/attendance/all` | Manager/Admin | All users' attendance |

#### POST /attendance/check-in
```json
// Request (optional)
{ "notes": "Working from home" }

// Response 201 — Success
{
  "success": true,
  "message": "Checked in successfully",
  "data": {
    "attendance": {
      "_id": "...",
      "user": { "name": "John Doe", "email": "john@example.com" },
      "date": "2026-02-20",
      "checkIn": "2026-02-20T09:00:00.000Z",
      "status": "present"
    }
  }
}

// Response 409 — Already checked in today
{
  "success": false,
  "message": "Attendance already marked for today (2026-02-20). Checked in at 09:00 AM."
}
```

#### GET /attendance/stats?month=2&year=2026
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_days": 15,
      "present_days": 12,
      "half_days": 2,
      "leave_days": 1,
      "absent_days": 0
    },
    "period": { "month": 2, "year": 2026 }
  }
}
```

---

### Task Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/tasks` | Employee+ | Create task |
| GET | `/tasks` | Employee+ | Get my tasks (filters + pagination) |
| GET | `/tasks/:id` | Employee+ | Get single task |
| PATCH | `/tasks/:id` | Employee+ | Update task |
| DELETE | `/tasks/:id` | Creator/Admin | Delete task |
| GET | `/tasks/all` | Manager/Admin | All users' tasks |

#### POST /tasks
```json
// Request
{
  "title": "Prepare Q1 report",
  "description": "Include financials for all departments",
  "priority": "high",
  "due_date": "2026-03-01"
}

// Response 201
{
  "success": true,
  "data": {
    "task": {
      "_id": "...",
      "title": "Prepare Q1 report",
      "priority": "high",
      "status": "todo",
      "dueDate": "2026-03-01T00:00:00.000Z",
      "isOverdue": false,
      "assignedTo": { "name": "John Doe" },
      "createdBy": { "name": "John Doe" }
    }
  }
}
```

#### PATCH /tasks/:id
```json
// Update status (completedAt auto-set by Mongoose pre-save hook)
{ "status": "completed" }

// Update priority + due date
{ "priority": "critical", "due_date": "2026-02-25" }
```

---

### Standard API Response Format

All responses follow this structure:
```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... } | null,
  "timestamp": "2026-02-20T09:00:00.000Z",
  "errors": [ ... ]  // only on validation failures
}
```

---

## 🔐 Security Implementation

| Concern | Implementation |
|---|---|
| **Password hashing** | `bcryptjs` 12 salt rounds — Mongoose `pre('save')` hook, `select: false` in schema |
| **JWT access token** | Short-lived (7d), signed with `JWT_SECRET` |
| **Refresh token rotation** | Stored in User document; old token deleted on every refresh |
| **HTTP headers** | `helmet.js` — CSP, X-Frame-Options, HSTS, etc. |
| **Rate limiting** | Global: 100 req/15min; Auth: 10 req/15min via `express-rate-limit` |
| **CORS** | Locked to `CORS_ORIGIN` env var only |
| **Input validation** | `express-validator` on every endpoint with detailed field errors |
| **MongoDB injection** | Mongoose parameterized queries — no string concatenation |
| **No-duplicate attendance** | MongoDB unique compound index `{ user, date }` |
| **Secrets** | 100% via `.env` — zero hardcoded credentials |
| **Request size limit** | Body capped at 10kb |
| **Non-root Docker** | Backend container runs as `nodeapp` user (UID 1001) |

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js >= 18
- MongoDB 6+ (local or Atlas)
- npm

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
# MONGODB_URI=mongodb://localhost:27017/attendance_system
# JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
# JWT_REFRESH_SECRET=<different 64-char random string>

# Start development server (auto-restarts on changes)
npm run dev
# ✅ Running at http://localhost:5000
# ✅ Health: http://localhost:5000/health
```

> **MongoDB Atlas (Cloud):** Replace `MONGODB_URI` with your Atlas connection string:
> `mongodb+srv://username:password@cluster.mongodb.net/attendance_system`

### 2. Frontend Setup

```bash
cd frontend

npm install

cp .env.example .env.local
# Set: REACT_APP_API_URL=http://localhost:5000/api

npm start
# ✅ Running at http://localhost:3000
```

---

## 🐳 Docker Setup (Recommended)

```bash
# 1. Configure secrets
cat > .env << EOF
MONGO_ROOT_USER=admin
MONGO_ROOT_PASS=YourStrongPassword
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
CORS_ORIGIN=http://localhost:3000
EOF

# 2. Build & start all services
docker-compose up -d --build

# 3. View logs
docker-compose logs -f backend

# Services:
# Frontend : http://localhost:3000
# Backend  : http://localhost:5000
# MongoDB  : localhost:27017
```

---

## ☁️ AWS EC2 Deployment (Ubuntu 22.04)

### Step 1 — Launch EC2
- Instance: Ubuntu 22.04 LTS (t2.micro for free tier)  
- Security Group: Open ports **22**, **3000**, **5000**

### Step 2 — Server Setup

```bash
# SSH in
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
sudo apt install -y docker-compose-v2

# Clone repo
git clone https://github.com/YOUR_USERNAME/attendance-system.git
cd attendance-system

# Set secrets
cat > .env << EOF
MONGO_ROOT_USER=admin
MONGO_ROOT_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
CORS_ORIGIN=http://YOUR_EC2_IP:3000
EOF

# Build & deploy
docker compose up -d --build
```

### Step 3 — Verify
```bash
curl http://YOUR_EC2_IP:5000/health
# {"success":true,"message":"Attendance System API is running","database":"MongoDB",...}
```

### MongoDB Atlas Alternative (Recommended for Production)
1. Create free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Whitelist your EC2 IP
3. Use connection string in `.env`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/attendance_system
   ```

---

## 🧪 Quick API Test

```bash
BASE=http://localhost:5000/api

# Signup
curl -s -X POST $BASE/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"Test1234","role":"employee"}' | jq .

# Login & save token
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234"}' | jq -r '.data.tokens.accessToken')

# Check in
curl -s -X POST $BASE/attendance/check-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Working from office"}' | jq .

# Create task
curl -s -X POST $BASE/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Complete project report","priority":"high","due_date":"2026-03-01"}' | jq .

# Get my tasks
curl -s $BASE/tasks -H "Authorization: Bearer $TOKEN" | jq .

# Get attendance stats
curl -s "$BASE/attendance/stats?month=2&year=2026" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## 📊 Role-Based Access Control

| Feature | Employee | Manager | Admin |
|---|:---:|:---:|:---:|
| Signup / Login | ✅ | ✅ | ✅ |
| Own check-in/out | ✅ | ✅ | ✅ |
| Own attendance history | ✅ | ✅ | ✅ |
| All employees' attendance | ❌ | ✅ | ✅ |
| Create own tasks | ✅ | ✅ | ✅ |
| Assign tasks to others | ❌ | ✅ | ✅ |
| View all tasks | ❌ | ✅ | ✅ |
| Delete any task | ❌ | ❌ | ✅ |

---

## 📝 License

MIT © 2026
