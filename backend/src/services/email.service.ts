import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';
import { marked } from 'marked';

// Lazy — reads env vars at call time, not at module load
const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Convert markdown to styled HTML for emails
const mdToHtml = (text: string): string => {
  if (!text) return '';
  const html = marked.parse(text, { async: false }) as string;
  // Wrap in styled div so email clients render nicely
  return `<div style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;">
    <style>
      strong { font-weight: 600; }
      em { font-style: italic; }
      ul, ol { margin: 8px 0 8px 20px; padding: 0; }
      li { margin-bottom: 4px; }
      h1,h2,h3 { font-weight: 600; margin: 12px 0 6px; }
      p { margin: 0 0 8px; }
      hr { border: none; border-top: 1px solid #e2e8f0; margin: 12px 0; }
    </style>
    ${html}
  </div>`;
};

const sendEmail = async (to: string, subject: string, html: string, appointmentId?: string): Promise<void> => {
  let emailRecord: any = null;
  if (appointmentId) {
    emailRecord = await prisma.emailNotification.create({
      data: { appointmentId, recipientEmail: to, subject, body: html, status: 'PENDING' },
    });
  }

  try {
    await getTransporter().sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    if (emailRecord) {
      await prisma.emailNotification.update({
        where: { id: emailRecord.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    }
  } catch (err) {
    console.error(`Email failed to ${to}:`, err);
    if (emailRecord) {
      await prisma.emailNotification.update({
        where: { id: emailRecord.id },
        data: { status: 'FAILED', retryCount: { increment: 1 } },
      });
    }
    throw err;
  }
};

const formatDate = (d: Date) =>
  new Date(d).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

export const sendBookingConfirmation = async (appointment: any): Promise<void> => {
  const { name: patientName, email: patientEmail } = appointment.patient.user;
  const { name: doctorName, email: doctorEmail } = appointment.doctor.user;
  const time = formatDate(appointment.scheduledAt);

  await sendEmail(
    patientEmail,
    'Appointment Confirmed ✅',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#10b981;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Appointment Confirmed</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi ${patientName},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">Your appointment has been confirmed.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p style="margin:0;font-size:13px;"><strong>Date &amp; Time:</strong> ${time}</p>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0;">Please arrive 10 minutes early.</p>
      </div>
    </div>`,
    appointment.id
  );

  await sendEmail(
    doctorEmail,
    'New Appointment Scheduled',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#0ea5e9;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">New Appointment</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi Dr. ${doctorName},</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;"><strong>Patient:</strong> ${patientName}</p>
          <p style="margin:0 0 8px;font-size:13px;"><strong>Date &amp; Time:</strong> ${time}</p>
          ${appointment.chiefComplaint ? `<p style="margin:0 0 8px;font-size:13px;"><strong>Chief Complaint:</strong> ${appointment.chiefComplaint}</p>` : ''}
          ${appointment.urgencyLevel ? `<p style="margin:0;font-size:13px;"><strong>Urgency:</strong> <span style="color:${appointment.urgencyLevel === 'HIGH' ? '#ef4444' : appointment.urgencyLevel === 'MEDIUM' ? '#f59e0b' : '#10b981'};font-weight:600;">${appointment.urgencyLevel}</span></p>` : ''}
        </div>
      </div>
    </div>`,
    appointment.id
  );
};

export const sendCancellationEmail = async (appointment: any): Promise<void> => {
  const time = formatDate(appointment.scheduledAt);

  await sendEmail(
    appointment.patient.user.email,
    'Appointment Cancelled',
    `<h2>Appointment Cancelled</h2>
    <p>Your appointment with Dr. ${appointment.doctor.user.name} on ${time} has been cancelled.</p>`,
    appointment.id
  );

  await sendEmail(
    appointment.doctor.user.email,
    'Appointment Cancelled',
    `<h2>Appointment Cancelled</h2>
    <p>The appointment with ${appointment.patient.user.name} on ${time} has been cancelled.</p>`,
    appointment.id
  );
};

export const sendAppointmentCancellationDueToLeave = async (appointment: any): Promise<void> => {
  const time = formatDate(appointment.scheduledAt);

  await sendEmail(
    appointment.patient.user.email,
    'Appointment Cancelled – Doctor on Leave',
    `<h2>Important: Appointment Cancelled</h2>
    <p>Hi ${appointment.patient.user.name},</p>
    <p>Your appointment with <strong>Dr. ${appointment.doctor.user.name}</strong> on <strong>${time}</strong> has been cancelled as the doctor will be on leave.</p>
    <p>Please log in to rebook at your convenience.</p>`,
    appointment.id
  );
};

export const sendMedicationReminder = async (
  patientEmail: string,
  patientName: string,
  medication: string,
  appointmentId: string
): Promise<void> => {
  await sendEmail(
    patientEmail,
    `Medication Reminder: ${medication}`,
    `<h2>Medication Reminder</h2>
    <p>Hi ${patientName},</p>
    <p>Time to take your medication: <strong>${medication}</strong>.</p>`,
    appointmentId
  );
};

export const sendPostVisitEmail = async (appointment: any): Promise<void> => {
  const summaryHtml = appointment.postVisitSummary
    ? mdToHtml(appointment.postVisitSummary)
    : '<p style="color:#666;font-style:italic;">Summary not available.</p>';

  const prescriptionHtml = appointment.prescription
    ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <p style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;font-weight:600;">Prescription</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0;white-space:pre-line;">${appointment.prescription}</p>
       </div>`
    : '';

  await sendEmail(
    appointment.patient.user.email,
    'Your Post-Visit Summary',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#0ea5e9;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Post-Visit Summary</h2>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">From Dr. ${appointment.doctor.user.name}</p>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi ${appointment.patient.user.name},</p>
        <p style="font-size:14px;color:#475569;margin:0 0 20px;">Here is your summary from your visit:</p>
        <div style="background:#f0f9ff;padding:16px;border-radius:8px;border-left:4px solid #0ea5e9;">
          ${summaryHtml}
        </div>
        ${prescriptionHtml}
        <p style="font-size:12px;color:#94a3b8;margin-top:24px;">This is an automated message from HealthCare Appointment Manager.</p>
      </div>
    </div>`,
    appointment.id
  );
};

export const retryFailedEmails = async (): Promise<void> => {
  const failed = await prisma.emailNotification.findMany({
    where: { status: 'FAILED', retryCount: { lt: 3 } },
  });

  for (const email of failed) {
    try {
      await getTransporter().sendMail({
        from: process.env.EMAIL_FROM,
        to: email.recipientEmail,
        subject: email.subject,
        html: email.body,
      });
      await prisma.emailNotification.update({
        where: { id: email.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch {
      await prisma.emailNotification.update({
        where: { id: email.id },
        data: { retryCount: { increment: 1 } },
      });
    }
  }
};
