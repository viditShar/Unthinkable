import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import doctorRoutes from './routes/doctor.routes';
import patientRoutes from './routes/patient.routes';
import appointmentRoutes from './routes/appointment.routes';
import calendarRoutes from './routes/calendar.routes';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/calendar', calendarRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test-ai', async (_req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ success: false, error: 'GEMINI_API_KEY is not set in .env' });
    return;
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const response = await model.generateContent('Say hello in one word');
    const text = response.response.text();
    res.json({ success: true, keyPrefix: key.substring(0, 8) + '...', response: text });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      keyPrefix: key.substring(0, 8) + '...',
      error: err.message,
      details: err?.status || err?.code || 'unknown',
    });
  }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
