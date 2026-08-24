# Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with separate portals for patients, doctors, and admins. Features AI-powered symptom summaries, post-visit summaries, email notifications, Google Calendar integration, and automated medication reminders.

---

## 🌐 Live Demo

| | URL |
|---|---|
| **Frontend** | https://unthinkable-psi.vercel.app |
| **Backend API** | https://unthinkable-36yt.onrender.com |

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@healthcare.com | Admin@123 |
| Doctor | dr.smith@healthcare.com | Doctor@123 |
| Patient | Register a new account on the site | — |

> ⚠️ The backend is hosted on Render's free tier. It may take 30–60 seconds to wake up on the first request.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Auth | JWT (role-based: patient / doctor / admin) |
| LLM | Google Gemini 3.6 Flash |
| Email | Nodemailer (Gmail SMTP port 465) with DB retry queue |
| Calendar | Google Calendar API (OAuth 2.0) |
| Jobs | node-cron (background tasks) |

---

## Features

### Patient Portal
- Register, log in, and manage profile
- Search doctors by specialisation or name
- 3-step booking: pick slot → symptom form → confirm
- Slot hold mechanism (10 minutes) prevents double-booking
- View appointments with AI pre-visit summary and urgency level
- Reschedule or cancel confirmed appointments
- Post-visit: AI patient-friendly summary + prescription

### Doctor Portal
- View today's schedule with urgency indicators (LOW / MEDIUM / HIGH)
- Pre-Visit Briefing: patient symptoms, AI summary, 3 suggested questions
- Submit post-visit notes and prescription
- AI generates patient-friendly post-visit summary
- Reschedule appointments

### Admin Portal
- Create doctor profiles (specialisation, working hours, slot duration, password)
- Add/remove leave days — auto-cancels affected bookings, notifies patients
- Remove doctors — cancels all upcoming bookings, cleans Google Calendar events
- View stats dashboard (total doctors, patients, appointments)

### Notifications (Email)
- Booking confirmation (patient + doctor)
- Reschedule notification (patient + doctor) with old/new time shown
- Cancellation (patient + doctor)
- Doctor on leave cancellation (patient only)
- Doctor removed cancellation (patient + doctor — different message per reason)
- Post-visit summary email (patient, fully formatted with markdown)
- Medication reminders (frequency-aware: once / daily / twice daily / weekly)

### Google Calendar
- Event created on booking (both patient and doctor as attendees)
- Event deleted on cancellation
- Old event deleted + new event created on reschedule
- Post-visit event updated with clinical notes and prescription
- Recurring medication reminder events per prescription line item
- Doctor removal cleans up all associated calendar events before DB deletion

### AI (Google Gemini 3.6 Flash)
- Pre-visit: urgency level, chief complaint, 3 suggested questions for the doctor
- Post-visit: patient-friendly summary with medication schedule and follow-up steps
- Graceful fallback — system never breaks if AI is unavailable

---

## Project Structure

```
healthcare-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB models
│   │   └── seed.ts              # Seeds admin + sample doctor
│   ├── src/
│   │   ├── controllers/         # auth, admin, doctor, patient, appointment
│   │   ├── middleware/          # JWT auth, role authorization
│   │   ├── routes/              # Express routers
│   │   ├── services/            # LLM, Email, Calendar, Reminders
│   │   ├── jobs/                # Cron jobs (reminders, retries, hold cleanup)
│   │   ├── utils/               # Prisma client, JWT helpers
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios instance (reads VITE_API_URL)
│   │   ├── components/          # Layout, ProtectedRoute, RescheduleModal
│   │   ├── context/             # AuthContext, ThemeContext (dark/light)
│   │   └── pages/
│   │       ├── admin/           # Dashboard, ManageDoctors, CreateDoctor
│   │       ├── doctor/          # Dashboard, Appointments, AppointmentDetail, PostVisitForm
│   │       └── patient/         # Dashboard, SearchDoctors, BookAppointment, Appointments, AppointmentDetail
│   └── .env.example
├── README.md
└── SYSTEM_DESIGN.md
```

---

## Local Development Setup

### Prerequisites
- Node.js v18+
- PostgreSQL (local or [Neon](https://neon.tech) free cloud)
- npm v9+
- A Gmail account with [App Password](https://myaccount.google.com/apppasswords) enabled
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free)

### 1. Clone the repository

```bash
git clone https://github.com/viditShar/Unthinkable.git
cd Unthinkable
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in all values:

```env
DATABASE_URL="postgresql://user:password@host/dbname"
JWT_SECRET="any-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM=your_gmail@gmail.com

GEMINI_API_KEY=your_gemini_api_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

### 3. Run database migrations and seed

```bash
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

This creates:
- **Admin**: `admin@healthcare.com` / `Admin@123`
- **Sample Doctor**: `dr.smith@healthcare.com` / `Doctor@123`

### 4. Set up the frontend

```bash
cd ../frontend
npm install
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Run both servers

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## Google Calendar Setup (Optional)

Without this, all other features work normally — calendar events just won't be created.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable **Google Calendar API**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add redirect URI: `http://localhost:5000/api/calendar/callback`
5. Copy **Client ID** and **Client Secret** to `.env`
6. Start backend → log in as Admin → visit `http://localhost:5000/api/calendar/auth`
7. Authorize with Google → copy the `refresh_token` from the JSON response
8. Add to `.env` as `GOOGLE_REFRESH_TOKEN`
9. Restart backend

---

## API Reference

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
| POST | `/api/appointments/confirm` | Patient | Confirm + symptoms |
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
| POST | `/api/doctors/me/appointments/:id/post-visit` | Submit post-visit notes |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| POST | `/api/admin/doctors` | Create doctor |
| DELETE | `/api/admin/doctors/:id` | Remove doctor + cleanup |
| POST | `/api/admin/doctors/:id/leave` | Add leave day |
| DELETE | `/api/admin/doctors/:id/leave/:leaveId` | Remove leave day |

---

## LLM Prompts

### Pre-visit summary
```
Analyse these symptoms and return ONLY a valid JSON object:
{
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH",
  "chiefComplaint": "one sentence",
  "suggestedQuestions": ["q1", "q2", "q3"],
  "summary": "2-3 sentence clinical summary"
}
Symptoms: <symptoms>
```

### Post-visit summary
```
Convert these clinical notes into a clear, patient-friendly summary
with medication schedule and follow-up steps.
Doctor Notes: <notes>
Prescription: <prescription>
```

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
  ├── EmailNotification[]   ← retry queue
  └── MedicationReminder[]  ← frequency-aware scheduler
```

---

## Deployment

### Backend → Render.com
1. Create a **Web Service** on [Render](https://render.com)
2. Connect `viditShar/Unthinkable` repo
3. **Root Directory**: `backend`
4. **Build Command**: `npm install && npx prisma generate && npm run build`
5. **Start Command**: `node dist/server.js`
6. Add all environment variables from `.env.example` in Render's Environment tab
7. Set `FRONTEND_URL` to your Vercel URL
8. Set `NODE_ENV=production`
9. Set `SMTP_PORT=465` (Render blocks port 587)

### Frontend → Vercel.com
1. Import repo on [Vercel](https://vercel.com)
2. **Root Directory**: `frontend`
3. Add environment variable: `VITE_API_URL=https://your-render-url.onrender.com/api`
4. Deploy
