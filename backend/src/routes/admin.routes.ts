import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createDoctor, getDoctors, updateDoctor, deleteDoctor,
  addLeaveDay, removeLeaveDay, getPatients, getStats
} from '../controllers/admin.controller';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', getStats);
router.post('/doctors', createDoctor);
router.get('/doctors', getDoctors);
router.put('/doctors/:doctorId', updateDoctor);
router.delete('/doctors/:doctorId', deleteDoctor);
router.post('/doctors/:doctorId/leave', addLeaveDay);
router.delete('/doctors/:doctorId/leave/:leaveId', removeLeaveDay);
router.get('/patients', getPatients);

export default router;
