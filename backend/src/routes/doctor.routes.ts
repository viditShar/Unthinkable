import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  searchDoctors, getDoctorById, getAvailableSlots,
  getDoctorAppointments, submitPostVisitNotes, updateDoctorProfile
} from '../controllers/doctor.controller';

const router = Router();

// Doctor-only routes MUST come before /:doctorId to avoid 'me' being treated as a doctorId
router.get('/me/appointments', authenticate, authorize('DOCTOR'), getDoctorAppointments);
router.put('/me/profile', authenticate, authorize('DOCTOR'), updateDoctorProfile);
router.post('/me/appointments/:appointmentId/post-visit', authenticate, authorize('DOCTOR'), submitPostVisitNotes);

// Public routes
router.get('/', searchDoctors);
router.get('/:doctorId', getDoctorById);
router.get('/:doctorId/slots', getAvailableSlots);

export default router;
