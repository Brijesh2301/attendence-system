# 📋 Attendance + Task Management System

A full-stack web application for managing employee attendance and tasks with JWT authentication and role-based access control.

**Tech Stack:** Node.js · Express · MongoDB (Mongoose) · React

---

## 📁 Project Structure

```
attendance-system/
├── backend/                  
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── models/
│   │   │   ├── User.model.js     
│   │   │   ├── Attendance.model.js
│   │   │   └── Task.model.js     
│   │   ├── controllers/          # Business logic
│   │   ├── middleware/           # Auth, validation, error handling
│   │   ├── routes/               # API routes
│   │   ├── utils/                # JWT, response helpers
│   │   └── server.js            
│   └── .env.example             
│
├── frontend/                 
│   ├── src/
│   │   ├── pages/                # Login, Signup, Dashboard, Tasks, Attendance
│   │   ├── components/           # Layout, PrivateRoute
│   │   ├── context/              # Auth state
│   │   └── services/api.js       # Axios + token refresh
│   └── .env.example             
│
└── docker-compose.yml           
```

---

## 🗄️ Database Design (MongoDB)

### Collections:

**Users**
```
_id, name, email (unique), password (bcrypt),
role (employee/manager/admin), isActive, refreshTokens[], timestamps
```

**Attendances**
```
_id, user (ref), date (YYYY-MM-DD), checkIn, checkOut,
status (present/absent/half_day/leave), notes, timestamps

Index: { user, date } → UNIQUE  ✅ No duplicate per day
```

**Tasks**
```
_id, title, description, assignedTo (ref), createdBy (ref),
priority (low/medium/high/critical),
status (todo/in_progress/completed/cancelled),
dueDate, completedAt, timestamps
```

---

## 🔌 API Reference

**Base URL:** `http://localhost:5000/api`

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register user |
| POST | `/auth/login` | Public | Login, get tokens |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | Private | Revoke token |
| GET | `/auth/me` | Private | Get profile |

### Attendance
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/attendance/check-in` | Employee+ | Mark check-in (no duplicate per day) |
| PATCH | `/attendance/check-out` | Employee+ | Mark check-out |
| GET | `/attendance/today` | Employee+ | Today's status |
| GET | `/attendance` | Employee+ | History with filters |
| GET | `/attendance/stats` | Employee+ | Monthly stats |
| GET | `/attendance/all` | Admin only | All employees attendance |

### Tasks
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/tasks` | Employee+ | Create task |
| GET | `/tasks` | Employee+ | My tasks |
| PATCH | `/tasks/:id` | Employee+ | Update task |
| DELETE | `/tasks/:id` | Creator/Admin | Delete task |
| GET | `/tasks/all` | Admin only | All employees tasks |

---

## 🔐 Security

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs (12 salt rounds) |
| Authentication | JWT Access Token (7d) + Refresh Token (30d) |
| Token rotation | Old refresh token revoked on every refresh |
| HTTP headers | helmet.js |
| Rate limiting | 100 req/15min global, 10 req/15min on auth |
| Input validation | express-validator on all endpoints |
| No hardcoded secrets | All credentials in `.env` |
| No duplicate attendance | MongoDB unique compound index `{ user, date }` |

---

## 🚀 Local Setup

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGODB_URI and JWT secrets in .env
npm run dev
# Running at http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Set REACT_APP_API_URL=http://localhost:5000/api
npm start
# Running at http://localhost:3000
```

---

## ☁️ AWS Deployment

```bash
# 1. SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 3. Clone repo
git clone https://github.com/YOUR_USERNAME/attendance-system.git
cd attendance-system/backend

# 4. Setup environment
cp .env.example .env
nano .env  # Add MongoDB Atlas URI and JWT secrets

# 5. Start backend
npm install
pm2 start src/server.js --name "attendance-backend"

# 6. Build and start frontend
cd ../frontend
npm install
echo "REACT_APP_API_URL=http://YOUR_EC2_IP:5000/api" > .env.local
npm run build
sudo npm install -g serve
pm2 start "serve -s build -l 3000" --name "attendance-frontend"
pm2 save
```

**Live URLs:**
```
Frontend : http://YOUR_EC2_IP:3000
API      : http://YOUR_EC2_IP:5000/api
Health   : http://YOUR_EC2_IP:5000/health
```

---

## 👥 Role Based Access

| Feature | Employee | Manager | Admin |
|---|:---:|:---:|:---:|
| Own attendance | ✅ | ✅ | ✅ |
| Own tasks | ✅ | ✅ | ✅ |
| All attendance | ❌ | ❌ | ✅ |
| All tasks | ❌ | ❌ | ✅ |
| Assign to others | ❌ | ✅ | ✅ |