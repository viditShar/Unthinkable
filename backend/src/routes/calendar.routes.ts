import { Router, Request, Response } from 'express';
import { getAuthUrl } from '../services/calendar.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { google } from 'googleapis';

const router = Router();

// Both routes protected — only admin can trigger the Google OAuth flow
router.get('/auth', authenticate, authorize('ADMIN'), (_req: Request, res: Response) => {
  const url = getAuthUrl();
  res.json({ success: true, url });
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) {
    res.status(400).json({ success: false, message: 'Authorization code missing' });
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(String(code));
    res.json({
      success: true,
      message: 'Copy the refresh_token to your .env as GOOGLE_REFRESH_TOKEN',
      tokens,
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to exchange token' });
  }
});

export default router;
