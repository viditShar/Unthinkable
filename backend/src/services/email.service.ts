import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';

// Lazy — reads env vars at call time, not at module load
const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

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
    `<h2>Appointment Confirmed</h2>
    <p>Hi ${patientName},</p>
    <p>Your appointment with <strong>Dr. ${doctorName}</strong> is confirmed for <strong>${time}</strong>.</p>
    <p>Please arrive 10 minutes early.</p>`,
    appointment.id
  );

  await sendEmail(
    doctorEmail,
    'New Appointment Scheduled',
    `<h2>New Appointment</h2>
    <p>Hi Dr. ${doctorName},</p>
    <p>New appointment with <strong>${patientName}</strong> on <strong>${time}</strong>.</p>
    ${appointment.chiefComplaint ? `<p><strong>Chief Complaint:</strong> ${appointment.chiefComplaint}</p>` : ''}
    ${appointment.urgencyLevel ? `<p><strong>Urgency:</strong> ${appointment.urgencyLevel}</p>` : ''}`,
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
  await sendEmail(
    appointment.patient.user.email,
    'Your Post-Visit Summary',
    `<h2>Post-Visit Summary</h2>
    <p>Hi ${appointment.patient.user.name},</p>
    <p>Here is your summary from your visit with Dr. ${appointment.doctor.user.name}:</p>
    <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:12px 0;">
      ${appointment.postVisitSummary ? appointment.postVisitSummary.replace(/\n/g, '<br/>') : 'Summary not available.'}
    </div>
    ${appointment.prescription ? `<p><strong>Prescription:</strong><br/>${appointment.prescription.replace(/\n/g, '<br/>')}</p>` : ''}`,
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
