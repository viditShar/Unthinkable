# Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with separate portals for patients, doctors, and admins. Features AI-powered symptom summaries, post-visit summaries, email notifications, Google Calendar integration, and automated medication reminders.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | Node.js, Express, TypeScript                    |
| Database   | PostgreSQL + Prisma ORM (v7)                    |
| Frontend   | React 19, TypeScript, Vite, Tailwind CSS v4     |
| Auth       | JWT (role-based: patient / doctor / admin)      |
| LLM        | OpenAI GPT-3.5-turbo                            |
| Email      | Nodemailer (Gmail SMTP)                         |
| Calendar   | Google Calendar API (OAuth 2.0)                 |
| Jobs       | node-cron                                       |

---

## Project Structure

```
healthcare-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # DB schema
│   │   └── seed.ts             # Seed admin + sample doctor
│   ├── src/
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/         # Auth middleware
│   │   ├── routes/             # Express routers
│   │   ├── services/           # LLM, Email, Calendar, Reminders
│   │   ├── jobs/               # Cron jobs
│   │   ├── utils/              # Prisma client, JWT
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   └── prisma.config.ts
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios instance
│   │   ├── context/            # Auth context
│   │   ├── components/         # Layout, ProtectedRoute
│   │   └── pages/
│   │       ├── admin/          # Dashboard, ManageDoctors, CreateDoctor
│   │       ├── doctor/         # Dashboard, Appointments, PostVisitForm
│   │       └── patient/        # Dashboard, SearchDoctors, BookAppointment, Appointments, Detail
│   └── .env.example
└── SYSTEM_DESIGN.md
```

---

## Setup Guide

### Prerequisites
- Node.js v18+
- PostgreSQL running locally (or a cloud instance)
- npm v9+

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your actual values
```

Key values to set:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — any long random string
- `SMTP_USER` / `SMTP_PASS` — Gmail address + [App Password](https://myaccount.google.com/apppasswords)
- `OPENAI_API_KEY` — from https://platform.openai.com
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` — see Google Calendar Setup below

```bash
# Frontend
cd frontend
cp .env.example .env
# Set VITE_API_URL to your backend URL
```

### 3. Database setup

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
```

This creates:
- Admin: `admin@healthcare.com` / `Admin@123`
- Sample doctor: `dr.smith@healthcare.com` / `Doctor@123`

### 4. Run development servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Backend runs on: http://localhost:5000
- Frontend runs on: http://localhost:5173

---

## API Docs

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Patient self-registration |
| POST | `/api/auth/login` | Login (all roles) |
| GET | `/api/auth/me` | Get current user |

### Doctors (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors?specialisation=&name=` | Search doctors |
| GET | `/api/doctors/:doctorId` | Get doctor details |
| GET | `/api/doctors/:doctorId/slots?date=YYYY-MM-DD` | Get available slots |

### Appointments (authenticated)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/api/appointments/hold` | Hold a slot (10 min) | PATIENT |
| POST | `/api/appointments/confirm` | Confirm booking + symptoms | PATIENT |
| GET | `/api/appointments/:id` | Get appointment detail | Any |
| PATCH | `/api/appointments/:id/cancel` | Cancel appointment | Patient/Doctor/Admin |
| PATCH | `/api/appointments/:id/reschedule` | Reschedule | PATIENT |

### Patient
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients/me/appointments` | My appointments |
| PUT | `/api/patients/me/profile` | Update profile |

### Doctor
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors/me/appointments` | My appointments |
| PUT | `/api/doctors/me/profile` | Update profile |
| POST | `/api/doctors/me/appointments/:id/post-visit` | Submit notes + prescription |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| POST | `/api/admin/doctors` | Create doctor |
| GET | `/api/admin/doctors` | List all doctors |
| PUT | `/api/admin/doctors/:doctorId` | Update doctor |
| POST | `/api/admin/doctors/:doctorId/leave` | Add leave day |
| DELETE | `/api/admin/doctors/:doctorId/leave/:leaveId` | Remove leave day |
| GET | `/api/admin/patients` | List all patients |

---

## DB Schema

Key models and relationships:

```
User (id, email, password, name, phone, role)
  ├── Patient (userId, dateOfBirth, bloodGroup, allergies)
  │     └── Appointment[] 
  └── Doctor (userId, specialisation, workingHours, slotDurationMins)
        ├── Appointment[]
        └── LeaveDay[]

Appointment (patientId, doctorId, scheduledAt, status, symptoms,
             preVisitSummary, urgencyLevel, chiefComplaint,
             doctorNotes, prescription, postVisitSummary,
             holdToken, holdExpiresAt)
  ├── EmailNotification[]
  └── MedicationReminder[]
```

---

## LLM Prompts

### Pre-visit summary
```
Analyse these symptoms and return a JSON object with:
- urgencyLevel: "LOW", "MEDIUM", or "HIGH"
- chiefComplaint: a brief one-sentence chief complaint
- suggestedQuestions: an array of exactly 3 questions the doctor should ask
- summary: a 2-3 sentence clinical pre-visit summary

Symptoms: <symptoms>
```

### Post-visit summary
```
Convert these clinical notes into a patient-friendly summary with medication
schedule and follow-up steps.

Doctor Notes: <notes>
Prescription: <prescription>

Include: diagnosis, medication schedule, follow-up steps, warnings.
```

---

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Calendar API**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URI: `http://localhost:5000/api/calendar/callback`
5. Copy **Client ID** and **Client Secret** to `.env`
6. Visit `GET /api/calendar/auth` → opens Google OAuth URL
7. Authorize → you'll be redirected to `/api/calendar/callback`
8. The response contains `tokens.refresh_token` — copy it to `.env` as `GOOGLE_REFRESH_TOKEN`

---

## Deployment

### Backend (Render)
1. Push to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Build command: `npm install && npx prisma generate && npx tsc`
4. Start command: `node dist/server.js`
5. Add all `.env` variables in Render's environment settings
6. Add a **PostgreSQL** database on Render and update `DATABASE_URL`

### Frontend (Vercel)
1. Import the `frontend/` folder into [Vercel](https://vercel.com)
2. Set `VITE_API_URL` to your Render backend URL
3. Deploy
