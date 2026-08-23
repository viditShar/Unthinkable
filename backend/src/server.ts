import 'dotenv/config'; // Must be first — loads .env before any other module initialises

import app from './app';
import { startJobs } from './jobs';

const PORT = process.env.PORT || 5000;

// Startup checks — warn about missing optional keys
const checkEnv = () => {
  const warnings: string[] = [];
  if (!process.env.GEMINI_API_KEY)   warnings.push('GEMINI_API_KEY not set — AI summaries disabled');
  if (!process.env.SMTP_USER)        warnings.push('SMTP_USER not set — emails disabled');
  if (!process.env.GOOGLE_REFRESH_TOKEN) warnings.push('GOOGLE_REFRESH_TOKEN not set — calendar disabled');
  warnings.forEach(w => console.warn(`[WARN] ${w}`));
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  checkEnv();
  startJobs();
});
