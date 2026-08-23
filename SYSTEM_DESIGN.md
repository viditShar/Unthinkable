# System Design Write-up

## Healthcare Appointment & Follow-up Manager

---

### Double-Booking Prevention

The core challenge is ensuring two patients cannot book the same doctor slot simultaneously, especially under concurrent requests.

**Database-level uniqueness** is the first line of defence. The `Appointment` table has a unique index on `(doctorId, scheduledAt)` via `@@index([doctorId, scheduledAt])`, and the `holdToken` field carries a `@unique` constraint — no two active holds can share a token.

**Two-phase booking** prevents race conditions at the application level:

1. **Hold phase**: When a patient selects a slot, the system runs a `prisma.$transaction` that atomically checks for any existing `PENDING` or `CONFIRMED` appointment at that `(doctorId, scheduledAt)` combination whose `holdExpiresAt` is still in the future, then creates a new `PENDING` appointment with a cryptographically random `holdToken` and a 10-minute `holdExpiresAt`. If the slot is already taken inside the same transaction, it throws `SLOT_TAKEN` and the transaction rolls back — the second concurrent request gets a 409 response immediately.

2. **Confirm phase**: The patient submits symptoms using the `holdToken` as a proof of ownership. The system verifies the token matches, checks it hasn't expired, then upgrades the record to `CONFIRMED` and clears the token. If the hold expired, the pending record is deleted and the patient must rebook.

A **cron job runs every 5 minutes** to clean up appointments that are still `PENDING` with an expired `holdExpiresAt` and a non-null `holdToken`, releasing those slots back into the pool automatically.

---

### Doctor Leave Conflict Handling

When an admin marks a doctor on leave for a date, the system performs the following atomically:

1. Creates the `LeaveDay` record (with a `@@unique([doctorId, date])` constraint to prevent duplicate leave entries for the same day).
2. Queries all `PENDING` or `CONFIRMED` appointments for that doctor on that date.
3. Updates each appointment status to `CANCELLED`.
4. Fires off notification emails to every affected patient asynchronously (fire-and-forget with error catching so a single email failure doesn't block the response).

The admin response includes the count of affected appointments so the operator has immediate visibility. The `sendAppointmentCancellationDueToLeave` email clearly explains the reason, and includes a prompt to rebook — maintaining patient trust.

---

### Slot Hold Mechanism

The hold mechanism solves a classic UX/concurrency conflict: showing a user that a slot is "available" and letting them fill a symptom form, only for it to be taken by the time they submit.

**Flow:**
```
Patient selects slot → POST /appointments/hold
  └─ DB transaction: check conflict → create PENDING record with holdToken + holdExpiresAt
     └─ Returns holdToken (10-min window)

Patient fills symptoms → POST /appointments/confirm  
  └─ Validates holdToken + expiry → upgrades to CONFIRMED
     └─ Triggers LLM summary, emails, calendar event
```

The `holdToken` is a 32-byte hex random string — unguessable and unique. Holding is scoped to the authenticated patient's `patientId`, so one patient cannot consume another's hold. The 10-minute window is a deliberate trade-off: long enough for a user to fill the symptom form, short enough to not lock out other patients for a meaningful period. The cleanup cron ensures stale holds don't accumulate indefinitely.

---

### Notification Failure Handling

Email delivery can fail for many reasons (SMTP rate limits, transient network errors, invalid addresses). The system handles this with a **persistent retry queue** backed by the database:

1. Every email attempt creates an `EmailNotification` record with `status: PENDING` before sending.
2. On success, it is updated to `status: SENT` with `sentAt` timestamp.
3. On failure, it is updated to `status: FAILED` with `retryCount` incremented.
4. A **cron job runs every 15 minutes** picking up all `FAILED` records with `retryCount < 3` and retrying them.
5. After 3 failures, the record is left in `FAILED` state for manual inspection — no infinite loops.

This means transient failures (brief SMTP outage) self-heal within 15-30 minutes, while permanent failures (bad address) are surfaced for ops review. All notification calls from controllers are non-blocking (`fire-and-forget` using `.catch(console.error)`) so a failing email never breaks the booking flow for the user.

**LLM failures** are handled the same way: the pre-visit and post-visit summary generation is wrapped in try/catch. If the OpenAI API is down or returns an error, the appointment is still created/completed with `preVisitSummary: null`. The doctor sees the symptoms directly in that case, and the patient still receives confirmation. The system never hard-blocks on LLM availability.

**Google Calendar** events follow the same pattern — all calendar API calls are fire-and-forget. If `GOOGLE_REFRESH_TOKEN` is not configured, the service logs a warning and returns early without throwing.

---

### Summary

The architecture prioritises **resilience over perfection**: bookings always succeed even if LLM/email/calendar integrations are down. Critical data flows (booking, cancellation, leave) are synchronous and transactional; non-critical flows (summaries, notifications, reminders) are asynchronous and retried. The slot hold pattern provides a clean user experience while the database transaction provides correctness under concurrent load.
