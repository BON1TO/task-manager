# TaskFlow — Team Task Manager

Full-stack web app with role-based access (Admin/Member), project management, and task tracking.

## Features
- JWT Authentication (Signup / Login)
- Projects with color coding
- Kanban board (Todo / In Progress / Done)
- Task creation, assignment, priority, due dates
- Role-based access: Admin can invite/remove members and delete tasks
- Dashboard with personal task stats + overdue alerts

## Stack
- **Frontend**: Single-page app in `FE.HTML` — dark aesthetic, WebGL aurora, particle network, GSAP animations
- **Backend**: Node.js + Express + MongoDB (Mongoose)

## Local Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET in .env
npm run dev
```

Open `http://localhost:5000` — the Express server serves `FE.HTML` from the project root.

## Railway Deployment

1. Push repo to GitHub
2. Create new Railway project → **Deploy from GitHub repo**
3. Set root directory to `backend/` (or deploy the whole repo and set the root dir)
4. Add environment variables in Railway dashboard:
   - `MONGO_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — any long random string
   - `FRONTEND_URL` — your Railway app URL
   - `NODE_ENV=production`
5. Railway auto-detects `package.json` and runs `node server.js`

The Express server serves `FE.HTML` as the frontend in production (`NODE_ENV=production`).

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login |
| GET | /api/auth/me | ✓ | Current user |
| GET | /api/projects | ✓ | My projects |
| POST | /api/projects | ✓ | Create project |
| GET | /api/projects/:id | ✓ Member | Project + tasks |
| PUT | /api/projects/:id | ✓ Admin | Update project |
| DELETE | /api/projects/:id | ✓ Owner | Delete project |
| POST | /api/projects/:id/members | ✓ Admin | Add member by email |
| DELETE | /api/projects/:id/members/:uid | ✓ Admin | Remove member |
| POST | /api/tasks | ✓ Member | Create task |
| PUT | /api/tasks/:id | ✓ Member | Update task |
| DELETE | /api/tasks/:id | ✓ Admin/Creator | Delete task |
| GET | /api/tasks/dashboard | ✓ | My task stats |
