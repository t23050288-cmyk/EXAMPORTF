# ExamGuard 🛡️
### Secure Online Examination Portal

## Stack
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT + Supabase

## Project Structure
```
EXAMPORTF/
├── frontend/          # React + Vite app
│   └── src/
│       ├── pages/     # LoginPage, ExamPage, ResultPage, AdminPage
│       └── components/admin/  # All admin tabs
├── api/               # Vercel serverless functions
│   ├── student-login.js
│   ├── get-exam.js
│   ├── save-answer.js
│   ├── log-violation.js
│   ├── submit-exam.js
│   └── admin/
├── supabase_setup.sql  # Run this in Supabase SQL editor first!
├── vercel.json
└── .env.example
```

## Setup Steps

### 1. Supabase Database
Run `supabase_setup.sql` in your Supabase SQL Editor.

### 2. Deploy to Vercel
1. Connect this GitHub repo to Vercel
2. Add these Environment Variables in Vercel Dashboard:
   - `VITE_SUPABASE_URL` = your supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_URL` = your supabase URL
   - `SUPABASE_SERVICE_KEY` = your service role key
   - `JWT_SECRET` = any random secret string

### 3. Vercel Build Settings
- Build Command: `cd frontend && npm install && npm run build`
- Output Directory: `frontend/dist`

### 4. Enable Supabase Realtime
In Supabase > Database > Replication, enable:
- `exam_status`
- `violations`
- `exam_config`

## Routes
- `/login` — Student login
- `/exam` — Proctored exam interface
- `/result` — Results + PDF download
- `/admin` — Admin panel (password: admin123)

## Admin Password
Default: `admin123` — change in `frontend/src/pages/AdminPage.jsx`
