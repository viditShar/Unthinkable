import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';
import { marked } from 'marked';

// Lazy — reads env vars at call time, not at module load
const getTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,  // true for 465 (SSL), false for 587 (TLS)
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

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
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#ef4444;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Appointment Cancelled</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi ${appointment.patient.user.name},</p>
        <div style="background:#fef2f2;padding:16px;border-radius:8px;border:1px solid #fecaca;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;"><strong>Doctor:</strong> Dr. ${appointment.doctor.user.name}</p>
          <p style="margin:0;font-size:13px;"><strong>Date &amp; Time:</strong> ${time}</p>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0;">Your appointment has been cancelled. Please log in to rebook.</p>
      </div>
    </div>`,
    appointment.id
  );

  await sendEmail(
    appointment.doctor.user.email,
    'Appointment Cancelled',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#ef4444;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Appointment Cancelled</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi Dr. ${appointment.doctor.user.name},</p>
        <div style="background:#fef2f2;padding:16px;border-radius:8px;border:1px solid #fecaca;">
          <p style="margin:0 0 8px;font-size:13px;"><strong>Patient:</strong> ${appointment.patient.user.name}</p>
          <p style="margin:0;font-size:13px;"><strong>Date &amp; Time:</strong> ${time}</p>
        </div>
      </div>
    </div>`,
    appointment.id
  );
};

export const sendAppointmentCancellationDueToLeave = async (appointment: any): Promise<void> => {
  const time = formatDate(appointment.scheduledAt);

  await sendEmail(
    appointment.patient.user.email,
    'Appointment Cancelled – Doctor on Leave',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#f59e0b;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Important: Appointment Cancelled</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi ${appointment.patient.user.name},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">Your upcoming appointment has been cancelled because <strong>Dr. ${appointment.doctor.user.name}</strong> will be on leave that day.</p>
        <div style="background:#fffbeb;padding:16px;border-radius:8px;border:1px solid #fde68a;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;"><strong>Doctor:</strong> Dr. ${appointment.doctor.user.name}</p>
          <p style="margin:0;font-size:13px;"><strong>Original Date &amp; Time:</strong> ${time}</p>
        </div>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 8px;">Please log in to book a new appointment at a different date.</p>
        <p style="font-size:13px;color:#64748b;margin:0;">We apologise for the inconvenience.</p>
      </div>
    </div>`,
    appointment.id
  );
};

export const sendAppointmentCancellationDueToRemoval = async (appointment: any): Promise<void> => {
  const time = formatDate(appointment.scheduledAt);

  await sendEmail(
    appointment.patient.user.email,
    'Appointment Cancelled – Doctor No Longer Available',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#ef4444;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Important: Appointment Cancelled</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi ${appointment.patient.user.name},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">We regret to inform you that your upcoming appointment has been cancelled because <strong>Dr. ${appointment.doctor.user.name}</strong> is no longer available at our clinic.</p>
        <div style="background:#fef2f2;padding:16px;border-radius:8px;border:1px solid #fecaca;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;"><strong>Doctor:</strong> Dr. ${appointment.doctor.user.name}</p>
          <p style="margin:0;font-size:13px;"><strong>Original Date &amp; Time:</strong> ${time}</p>
        </div>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 8px;">Please log in to book a new appointment with another available doctor.</p>
        <p style="font-size:13px;color:#64748b;margin:0;">We apologise for the inconvenience.</p>
      </div>
    </div>`,
    appointment.id
  );
};

export const sendDoctorWelcomeEmail = async (doctorEmail: string, doctorName: string, tempPassword: string): Promise<void> => {
  await sendEmail(
    doctorEmail,
    'Welcome to HealthCare – Your Account is Ready',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#0ea5e9;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Welcome to HealthCare</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi Dr. ${doctorName},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">Your doctor account has been created on the HealthCare Appointment Manager platform. You can now log in to view and manage your appointments.</p>
        <div style="background:#f0f9ff;padding:16px;border-radius:8px;border:1px solid #bae6fd;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;"><strong>Login Email:</strong> ${doctorEmail}</p>
          <p style="margin:0;font-size:13px;"><strong>Temporary Password:</strong> <code style="background:#e0f2fe;padding:2px 6px;border-radius:4px;font-size:13px;">${tempPassword}</code></p>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0;">Please change your password after your first login.</p>
      </div>
    </div>`
  );
};

export const sendDoctorRemovalEmail = async (doctorEmail: string, doctorName: string, appointmentCount: number): Promise<void> => {
  await sendEmail(
    doctorEmail,
    'Your Account Has Been Removed – HealthCare',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#64748b;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Account Removed</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi Dr. ${doctorName},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">Your doctor profile has been removed from the HealthCare Appointment Manager platform by an administrator.</p>
        ${appointmentCount > 0 ? `<div style="background:#fff7ed;padding:16px;border-radius:8px;border:1px solid #fed7aa;margin-bottom:16px;"><p style="margin:0;font-size:13px;color:#92400e;"><strong>${appointmentCount} upcoming appointment(s)</strong> have been cancelled and affected patients have been notified.</p></div>` : ''}
        <p style="font-size:13px;color:#64748b;margin:0;">If you believe this was done in error, please contact the clinic administration.</p>
      </div>
    </div>`
  );
};

export const sendRescheduleEmail = async (appointment: any, oldTime: Date): Promise<void> => {
  const { name: patientName, email: patientEmail } = appointment.patient.user;
  const { name: doctorName, email: doctorEmail } = appointment.doctor.user;
  const oldTimeStr = formatDate(oldTime);
  const newTimeStr = formatDate(appointment.scheduledAt);

  await sendEmail(
    patientEmail,
    'Appointment Rescheduled 🔄',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#8b5cf6;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Appointment Rescheduled</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi ${patientName},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">Your appointment with <strong>Dr. ${doctorName}</strong> has been rescheduled.</p>
        <div style="background:#f5f3ff;padding:16px;border-radius:8px;border:1px solid #ddd6fe;margin-bottom:12px;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-decoration:line-through;"><strong>Previous:</strong> ${oldTimeStr}</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#5b21b6;"><strong>New Time:</strong> ${newTimeStr}</p>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0;">A new calendar invite has been sent. Please update your schedule accordingly.</p>
      </div>
    </div>`,
    appointment.id
  );

  await sendEmail(
    doctorEmail,
    'Appointment Rescheduled 🔄',
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#8b5cf6;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Appointment Rescheduled</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi Dr. ${doctorName},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">Your appointment with <strong>${patientName}</strong> has been rescheduled.</p>
        <div style="background:#f5f3ff;padding:16px;border-radius:8px;border:1px solid #ddd6fe;margin-bottom:12px;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-decoration:line-through;"><strong>Previous:</strong> ${oldTimeStr}</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#5b21b6;"><strong>New Time:</strong> ${newTimeStr}</p>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0;">The calendar invite has been updated automatically.</p>
      </div>
    </div>`,
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
    `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#10b981;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">💊 Medication Reminder</h2>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hi ${patientName},</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:16px;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#15803d;">Time to take: ${medication}</p>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0;">Stay consistent with your medication schedule for the best results.</p>
      </div>
    </div>`,
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
