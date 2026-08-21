// ──────────────────────────────────────────────
//  ISA MARATHON - SHARED VALIDATION SCHEMAS
// ──────────────────────────────────────────────

import { z } from 'zod';

export const registrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[+]?[\d\s-]{10,15}$/, 'Invalid phone number'),
  companyId: z.string().optional(),
  companyName: z.string().min(2).max(100).optional(),
  category: z.enum(['RUN_3K', 'RUN_5K']),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY']),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().or(z.literal('')).or(z.null()).transform(v => v === '' || v === null ? undefined : v),
  tshirtSize: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']).optional().or(z.literal('')).or(z.null()).transform(v => v === '' || v === null ? undefined : v),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const gpsUpdateSchema = z.object({
  participantId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100),
  speed: z.number().min(0).optional(),
  altitude: z.number().optional(),
  timestamp: z.string().datetime(),
});

export type GpsUpdateData = z.infer<typeof gpsUpdateSchema>;

export const checkinSchema = z.object({
  qrData: z.string().min(1),
});

export type CheckinData = z.infer<typeof checkinSchema>;

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'warning', 'emergency']),
});

export type AnnouncementData = z.infer<typeof announcementSchema>;

export const routePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const routeSchema = z.object({
  name: z.string().min(1).max(200),
  totalDistance: z.number().positive(),
  points: z.array(routePointSchema).min(2),
});

export type RouteFormData = z.infer<typeof routeSchema>;

// ──────────────────────────────────────────────
//  ISA MARATHON - UI COMPONENTS
// ──────────────────────────────────────────────

export { Logo, type LogoProps, type LogoSize, type LogoTheme } from './components/Logo';
