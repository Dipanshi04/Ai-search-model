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
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    tshirtSize: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']).optional(),
});
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
export const gpsUpdateSchema = z.object({
    participantId: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0).max(100),
    speed: z.number().min(0).optional(),
    altitude: z.number().optional(),
    timestamp: z.string().datetime(),
});
export const checkinSchema = z.object({
    qrData: z.string().min(1),
});
export const announcementSchema = z.object({
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(1000),
    type: z.enum(['info', 'warning', 'emergency']),
});
export const routePointSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});
export const routeSchema = z.object({
    name: z.string().min(1).max(200),
    totalDistance: z.number().positive(),
    points: z.array(routePointSchema).min(2),
});
//# sourceMappingURL=index.js.map