import { z } from 'zod';
export declare const registrationSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    companyId: z.ZodOptional<z.ZodString>;
    companyName: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["RUN_3K", "RUN_5K"]>;
    gender: z.ZodEnum<["MALE", "FEMALE", "NON_BINARY"]>;
    emergencyContact: z.ZodOptional<z.ZodString>;
    emergencyPhone: z.ZodOptional<z.ZodString>;
    bloodGroup: z.ZodOptional<z.ZodEnum<["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]>>;
    tshirtSize: z.ZodOptional<z.ZodEnum<["XS", "S", "M", "L", "XL", "XXL"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    category: "RUN_3K" | "RUN_5K";
    gender: "MALE" | "FEMALE" | "NON_BINARY";
    email: string;
    phone: string;
    companyId?: string | undefined;
    emergencyContact?: string | undefined;
    emergencyPhone?: string | undefined;
    bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | undefined;
    tshirtSize?: "M" | "S" | "XS" | "L" | "XL" | "XXL" | undefined;
    companyName?: string | undefined;
}, {
    name: string;
    category: "RUN_3K" | "RUN_5K";
    gender: "MALE" | "FEMALE" | "NON_BINARY";
    email: string;
    phone: string;
    companyId?: string | undefined;
    emergencyContact?: string | undefined;
    emergencyPhone?: string | undefined;
    bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | undefined;
    tshirtSize?: "M" | "S" | "XS" | "L" | "XL" | "XXL" | undefined;
    companyName?: string | undefined;
}>;
export type RegistrationFormData = z.infer<typeof registrationSchema>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginFormData = z.infer<typeof loginSchema>;
export declare const gpsUpdateSchema: z.ZodObject<{
    participantId: z.ZodString;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    accuracy: z.ZodNumber;
    speed: z.ZodOptional<z.ZodNumber>;
    altitude: z.ZodOptional<z.ZodNumber>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    participantId: string;
    accuracy: number;
    timestamp: string;
    speed?: number | undefined;
    altitude?: number | undefined;
}, {
    lat: number;
    lng: number;
    participantId: string;
    accuracy: number;
    timestamp: string;
    speed?: number | undefined;
    altitude?: number | undefined;
}>;
export type GpsUpdateData = z.infer<typeof gpsUpdateSchema>;
export declare const checkinSchema: z.ZodObject<{
    qrData: z.ZodString;
}, "strip", z.ZodTypeAny, {
    qrData: string;
}, {
    qrData: string;
}>;
export type CheckinData = z.infer<typeof checkinSchema>;
export declare const announcementSchema: z.ZodObject<{
    title: z.ZodString;
    message: z.ZodString;
    type: z.ZodEnum<["info", "warning", "emergency"]>;
}, "strip", z.ZodTypeAny, {
    type: "info" | "warning" | "emergency";
    title: string;
    message: string;
}, {
    type: "info" | "warning" | "emergency";
    title: string;
    message: string;
}>;
export type AnnouncementData = z.infer<typeof announcementSchema>;
export declare const routePointSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
}, {
    lat: number;
    lng: number;
}>;
export declare const routeSchema: z.ZodObject<{
    name: z.ZodString;
    totalDistance: z.ZodNumber;
    points: z.ZodArray<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    totalDistance: number;
    points: {
        lat: number;
        lng: number;
    }[];
}, {
    name: string;
    totalDistance: number;
    points: {
        lat: number;
        lng: number;
    }[];
}>;
export type RouteFormData = z.infer<typeof routeSchema>;
//# sourceMappingURL=index.d.ts.map