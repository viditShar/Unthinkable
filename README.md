# Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with separate portals for patients, doctors, and admins. Features AI-powered symptom summaries, post-visit summaries, email notifications, Google Calendar integration, and automated medication reminders.

---

## 🌐 Hosted Application

> **Frontend:** _[Add your Vercel URL here]_
> **Backend API:** _[Add your Render URL here]_

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | Node.js, Express, TypeScript                    |
| Database   | PostgreSQL + Prisma ORM (v6)                    |
| Frontend   | React 19, TypeScript, Vite, Tailwind CSS v4     |
| Auth       | JWT (role-based: patient / doctor / admin)      |
| LLM        | Google Gemini 3.6 Flash                         |
| Email      | Nodemailer (Gmail SMTP) with DB retry queue     |
| Calendar   | Google Calendar API (OAuth 2.0)                 |
| Jobs       | node-cron (background tasks)                    |

---

## Project Structure

```
healthcare-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── controllers/     # auth, admin, doctor, patient, appointment
│   │   ├── middleware/      # JWT auth, role authorization
│   │   ├── routes/          # Express routers
│   │   ├── services/        # LLM, Email, Calendar, Reminders
│   │   ├── jobs/            # Cron jobs
│   │   ├── utils/           # Prisma client, JWT helpers
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instance
│   │   ├── components/      # Layout, ProtectedRoute, RescheduleModal
│   │   ├── context/         # AuthContext, ThemeContext
│   │   └── pages/
│   │       ├── admin/       # Dashboard, ManageDoctors, CreateDoctor
│   │       ├── doctor/      # Dashboard, Appointments, AppointmentDetail, PostVisitForm
│   │       └── patient/     # Dashboard, SearchDoctors, BookAppointment, Appointments, AppointmentDetail
│   └── .env.example
├── README.md
└── SYSTEM_DESIGN.md
```

---

## Features

### Patient Portal
- Register, log in, and manage profile
- Search doctors by specialisation or name
- 3-step booking: pick slot → symptom form → confirm
- View appointments with AI pre-visit summary, urgency level
- Reschedule or cancel confirmed appointments
- Post-visit: AI patient-friendly summary + prescription

### Doctor Portal
- View today's schedule with urgency indicators
- Pre-Visit Briefing: patient symptoms, AI summary, 3 suggested questions
- Submit post-visit notes and prescription
- AI generates patient-friendly post-visit summary
- Reschedule appointments

### Admin Portal
- Create doctor profiles (specialisation, working hours, slot duration)
- Add/remove leave days — auto-cancels affected bookings, notifies patients
- Remove doctors — cancels all upcoming bookings, deletes calendar events
- View stats dashboard

### Notifications
- Booking confirmation (patient + doctor)
- Reschedule notification (patient + doctor) with old/new time
- Cancellation (patient + doctor)
- Doctor on leave cancellation (patient)
- Doctor removed cancellation (patient + doctor)
- Post-visit summary email (patient, markdown rendered)
- Medication reminders via email (frequency-aware)

### Google Calendar
- Event created on booking (both patient and doctor as attendees)
- Event deleted on cancellation
- Old event deleted + new event created on reschedule
- Post-visit event updated with clinical summary
- Recurring medication reminder events per prescription item
- Doctor removal cleans up all calendar events before DB deletion

### AI (Gemini 3.6 Flash)
- Pre-visit: urgency level (LOW/MEDIUM/HIGH), chief complaint, 3 suggested questions
- Post-visit: patient-friendly summary with medication schedule and follow-up steps
- Graceful fallback — system never breaks if AI is unavailable

---

## Setup Guide

### Prerequisites
- Node.js v18+
- PostgreSQL (local or [Neon](https://neon.tech) free cloud)
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
cd backend
cp .env.example .env
# Fill in all values — see .env.example for instructions
```

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to your backend URL
```

### 3. Database setup

```bash
cd backend
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

Seed creates:
- Admin: `admin@healthcare.com` / `Admin@123`
- Sample doctor: `dr.smith@healthcare.com` / `Doctor@123` ← change after first login

### 4. Run development servers

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

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
| GET | `/api/doctors/:doctorId` | Doctor details |
| GET | `/api/doctors/:doctorId/slots?date=YYYY-MM-DD` | Available slots |

### Appointments (authenticated)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/appointments/hold` | Patient | Hold slot (10 min) |
| POST | `/api/appointments/confirm` | Patient | Confirm + symptom form |
| GET | `/api/appointments/:id` | Any | View appointment |
| PATCH | `/api/appointments/:id/cancel` | Patient/Doctor/Admin | Cancel |
| PATCH | `/api/appointments/:id/reschedule` | Patient/Doctor | Reschedule |

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
| POST | `/api/doctors/me/appointments/:id/post-visit` | Submit notes |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| POST | `/api/admin/doctors` | Create doctor |
| GET | `/api/admin/doctors` | List all doctors |
| PUT | `/api/admin/doctors/:id` | Update doctor |
| DELETE | `/api/admin/doctors/:id` | Remove doctor |
| POST | `/api/admin/doctors/:id/leave` | Add leave day |
| DELETE | `/api/admin/doctors/:id/leave/:leaveId` | Remove leave day |

---

## DB Schema

```
User (id, email, password, name, phone, role)
  ├── Patient (userId, dateOfBirth, bloodGroup, allergies)
  │     └── Appointment[]
  └── Doctor (userId, specialisation, workingHours, slotDurationMins)
        ├── Appointment[]
        └── LeaveDay[]

Appointment (patientId, doctorId, scheduledAt, status,
             symptoms, preVisitSummary, urgencyLevel, chiefComplaint, suggestedQuestions,
             doctorNotes, prescription, postVisitSummary,
             patientCalendarEventId, doctorCalendarEventId,
             holdToken, holdExpiresAt)
  ├── EmailNotification[]
  └── MedicationReminder[]
```

---

## LLM Prompts

### Pre-visit
```
Analyse these symptoms and return ONLY a valid JSON object:
{
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH",
  "chiefComplaint": "...",
  "suggestedQuestions": ["...", "...", "..."],
  "summary": "..."
}
Symptoms: <symptoms>
```

### Post-visit
```
Convert these clinical notes into a clear, patient-friendly summary
with medication schedule and follow-up steps.
Doctor Notes: <notes>
Prescription: <prescription>
```

---

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable **Google Calendar API**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add redirect URI: `http://localhost:5000/api/calendar/callback`
5. Add Client ID + Secret to `.env`
6. Start backend → visit `http://localhost:5000/api/calendar/auth` as Admin
7. Authorize → copy `refresh_token` from response to `.env` as `GOOGLE_REFRESH_TOKEN`

---

## Deployment

### Backend → Render.com
1. Push to GitHub
2. New **Web Service** on [Render](https://render.com)
3. Build: `npm install && npx prisma generate && npm run build`
4. Start: `node dist/server.js`
5. Add all `.env` variables in Render settings
6. Add Render PostgreSQL → update `DATABASE_URL`

### Frontend → Vercel.com
1. Import `frontend/` at [Vercel](https://vercel.com)
2. Set `VITE_API_URL` to your Render backend URL
3. Deploy

> After deploying, update the hosted links at the top of this README.
