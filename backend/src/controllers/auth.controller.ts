import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { validationResult } from 'express-validator';

export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { name, email, password, phone, role } = req.body;

  if (role && role !== 'PATIENT') {
    res.status(400).json({ success: false, message: 'Only patients can self-register' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already in use' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name, email, password: hashedPassword, phone,
      role: 'PATIENT',
      patientProfile: { create: {} },
    },
    include: { patientProfile: true },
  });

  const token = signToken({ userId: user.id, role: user.role, email: user.email });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ success: false, message: 'No account found with this email address', code: 'EMAIL_NOT_FOUND' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ success: false, message: 'Incorrect password', code: 'WRONG_PASSWORD' });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });

  res.json({
    success: true,
    data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
  });
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { patientProfile: true, doctorProfile: true },
  });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  const { password: _pw, ...safeUser } = user;
  res.json({ success: true, data: safeUser });
};
