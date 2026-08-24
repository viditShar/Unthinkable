import { google } from 'googleapis';
import prisma from '../utils/prisma';

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

export const getAuthUrl = (): string => {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  });
};

const getServiceCalendar = () => {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth: oauth2Client });
};

const buildDescription = (appointment: any): string => {
  const lines: string[] = [
    `👤 Patient: ${appointment.patient?.user?.name || 'Patient'}`,
    `🩺 Doctor: Dr. ${appointment.doctor?.user?.name || 'Doctor'}${appointment.doctor?.specialisation ? ' (' + appointment.doctor.specialisation + ')' : ''}`,
    '',
  ];

  if (appointment.symptoms) {
    lines.push(`📋 Symptoms: ${appointment.symptoms}`);
  }
  if (appointment.chiefComplaint) {
    lines.push(`🔍 Chief Complaint: ${appointment.chiefComplaint}`);
  }
  if (appointment.urgencyLevel) {
    lines.push(`⚡ Urgency Level: ${appointment.urgencyLevel}`);
  }
  if (appointment.preVisitSummary) {
    lines.push('', '📝 Pre-Visit AI Summary:', appointment.preVisitSummary);
  }
  if (appointment.suggestedQuestions) {
    try {
      const qs: string[] = JSON.parse(appointment.suggestedQuestions);
      if (qs.length > 0) {
        lines.push('', '❓ Suggested Questions for Doctor:');
        qs.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`));
      }
    } catch {}
  }
  if (appointment.doctorNotes) {
    lines.push('', '🏥 Doctor Notes:', appointment.doctorNotes);
  }
  if (appointment.prescription) {
    lines.push('', '💊 Prescription / Medication Schedule:', appointment.prescription);
  }
  if (appointment.postVisitSummary) {
    lines.push('', '✅ Post-Visit Patient Summary:', appointment.postVisitSummary);
  }
  lines.push('', '─────────────────────────────', 'Managed via HealthCare Appointment Manager');

  return lines.join('\n');
};

export const createCalendarEvent = async (appointment: any): Promise<void> => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('[Calendar] GOOGLE_REFRESH_TOKEN not set — skipping');
    return;
  }

  try {
    const calendar = getServiceCalendar();
    const startTime = new Date(appointment.scheduledAt);
    const endTime   = new Date(startTime.getTime() + (appointment.slotDurationMins || 30) * 60000);

    const patientEmail = appointment.patient?.user?.email;
    const doctorEmail  = appointment.doctor?.user?.email;
    const patientName  = appointment.patient?.user?.name || 'Patient';
    const doctorName   = appointment.doctor?.user?.name || 'Doctor';

    const event = {
      summary: `🏥 Appointment: ${patientName} with Dr. ${doctorName}`,
      description: buildDescription(appointment),
      start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
      end:   { dateTime: endTime.toISOString(),   timeZone: 'UTC' },
      attendees: [
        ...(patientEmail ? [{ email: patientEmail, displayName: patientName }] : []),
        ...(doctorEmail  ? [{ email: doctorEmail,  displayName: `Dr. ${doctorName}` }] : []),
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    console.log(`[Calendar] Creating event for appointment ${appointment.id}...`);

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });

    const eventId = response.data.id!;
    console.log(`[Calendar] Event created: ${eventId}`);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { patientCalendarEventId: eventId },
    });
  } catch (err: any) {
    console.error('[Calendar] createCalendarEvent failed:', err?.message || err);
    if (err?.response?.data) {
      console.error('[Calendar] API error detail:', JSON.stringify(err.response.data));
    }
  }
};

// Called after post-visit notes saved — updates event with full clinical info
export const updateCalendarEventWithPostVisit = async (appointment: any): Promise<void> => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return;
  if (!appointment.patientCalendarEventId) return;

  try {
    const calendar = getServiceCalendar();
    const patientName = appointment.patient?.user?.name || 'Patient';
    const doctorName  = appointment.doctor?.user?.name || 'Doctor';

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: appointment.patientCalendarEventId,
      requestBody: {
        summary: `✅ Completed: ${patientName} with Dr. ${doctorName}`,
        description: buildDescription(appointment),
      },
      sendUpdates: 'all',
    });
    console.log(`[Calendar] Event updated with post-visit info: ${appointment.patientCalendarEventId}`);
  } catch (err: any) {
    console.error('[Calendar] updateCalendarEventWithPostVisit failed:', err?.message || err);
  }
};

export const updateCalendarEvent = async (appointment: any): Promise<void> => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return;
  if (!appointment.patientCalendarEventId) return;

  try {
    const calendar = getServiceCalendar();
    const startTime = new Date(appointment.scheduledAt);
    const endTime   = new Date(startTime.getTime() + (appointment.slotDurationMins || 30) * 60000);

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: appointment.patientCalendarEventId,
      requestBody: {
        start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
        end:   { dateTime: endTime.toISOString(),   timeZone: 'UTC' },
        description: buildDescription(appointment),
      },
      sendUpdates: 'all',
    });
    console.log(`[Calendar] Event rescheduled: ${appointment.patientCalendarEventId}`);
  } catch (err: any) {
    console.error('[Calendar] updateCalendarEvent failed:', err?.message || err);
  }
};

export const deleteCalendarEvent = async (appointment: any): Promise<void> => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return;

  const calendar = getServiceCalendar();

  const deleteById = async (eventId: string) => {
    try {
      await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' });
      console.log(`[Calendar] Event deleted: ${eventId}`);
    } catch (err: any) {
      console.error('[Calendar] deleteCalendarEvent failed:', err?.message || err);
    }
  };

  if (appointment.patientCalendarEventId) await deleteById(appointment.patientCalendarEventId);
  if (appointment.doctorCalendarEventId)  await deleteById(appointment.doctorCalendarEventId);
};

// Delete old event and create a new one for rescheduled appointments
export const replaceCalendarEvent = async (appointment: any): Promise<void> => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return;

  // Delete old event first
  if (appointment.patientCalendarEventId) {
    await deleteCalendarEvent(appointment);
  }

  // Create fresh event with new time
  await createCalendarEvent(appointment);
};

// Creates recurring calendar events for each medication in the prescription
export const createMedicationCalendarEvents = async (appointment: any): Promise<void> => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return;
  if (!appointment.prescription) return;

  try {
    const calendar = getServiceCalendar();
    const patientName = appointment.patient?.user?.name || 'Patient';
    const patientEmail = appointment.patient?.user?.email;
    const doctorName = appointment.doctor?.user?.name || 'Doctor';

    const lines: string[] = appointment.prescription.split('\n').filter(Boolean);

    for (const line of lines) {
      const [medication, freqStr] = line.split('-').map((s: string) => s.trim());
      if (!medication) continue;

      const freq = (freqStr || '').toLowerCase();

      // Map frequency to RRULE
      let rrule: string;
      let intervalHours = 24;

      if (freq.includes('twice') || freq.includes('2x')) {
        rrule = 'RRULE:FREQ=DAILY;INTERVAL=1;BYHOUR=8,20';  // 8am and 8pm
        intervalHours = 12;
      } else if (freq.includes('three') || freq.includes('3x')) {
        rrule = 'RRULE:FREQ=DAILY;INTERVAL=1;BYHOUR=8,14,20';
        intervalHours = 8;
      } else if (freq.includes('weekly') || freq.includes('week')) {
        rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=1';
        intervalHours = 168;
      } else if (freq.includes('once')) {
        rrule = '';  // Single event only
        intervalHours = 0;
      } else {
        rrule = 'RRULE:FREQ=DAILY;INTERVAL=1';  // Default: once daily
        intervalHours = 24;
      }

      // Start tomorrow at 9am UTC
      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setUTCHours(9, 0, 0, 0);

      const end = new Date(start.getTime() + 15 * 60 * 1000); // 15 min duration

      const eventBody: any = {
        summary: `💊 Take ${medication}`,
        description: [
          `Medication: ${medication}`,
          freqStr ? `Frequency: ${freqStr}` : '',
          '',
          `Prescribed by Dr. ${doctorName}`,
          `Patient: ${patientName}`,
        ].filter(Boolean).join('\n'),
        start: { dateTime: start.toISOString(), timeZone: 'UTC' },
        end:   { dateTime: end.toISOString(),   timeZone: 'UTC' },
        attendees: patientEmail ? [{ email: patientEmail, displayName: patientName }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 5 },
            { method: 'email', minutes: 30 },
          ],
        },
        colorId: '2', // Green colour for medication events
      };

      if (rrule) {
        eventBody.recurrence = [rrule];
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventBody,
        sendUpdates: 'all',
      });

      console.log(`[Calendar] Medication event created for "${medication}": ${response.data.id}`);
    }
  } catch (err: any) {
    console.error('[Calendar] createMedicationCalendarEvents failed:', err?.message || err);
  }
};
