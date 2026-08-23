import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getMyAppointments, updatePatientProfile } from '../controllers/patient.controller';

const router = Router();

router.use(authenticate, authorize('PATIENT'));

router.get('/me/appointments', getMyAppointments);
router.put('/me/profile', updatePatientProfile);

export default router;
