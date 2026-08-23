import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  holdSlot, confirmBooking, cancelAppointment,
  rescheduleAppointment, getAppointment
} from '../controllers/appointment.controller';

const router = Router();

router.use(authenticate);

router.post('/hold', authorize('PATIENT'), holdSlot);
router.post('/confirm', authorize('PATIENT'), confirmBooking);
router.get('/:appointmentId', getAppointment);
router.patch('/:appointmentId/cancel', cancelAppointment);
router.patch('/:appointmentId/reschedule', authorize('PATIENT'), rescheduleAppointment);

export default router;
