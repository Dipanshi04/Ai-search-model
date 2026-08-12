// ──────────────────────────────────────────────
//  ISA MARATHON - SHARED TYPES
// ──────────────────────────────────────────────

// Enums
export enum EventStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum Category {
  RUN_3K = 'RUN_3K',
  RUN_5K = 'RUN_5K',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
}

export enum ParticipantStatus {
  REGISTERED = 'REGISTERED',
  CHECKED_IN = 'CHECKED_IN',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  DNF = 'DNF',
  DNS = 'DNS',
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  RACE_MANAGER = 'RACE_MANAGER',
  CHECKIN_STAFF = 'CHECKIN_STAFF',
  ANALYTICS_VIEWER = 'ANALYTICS_VIEWER',
}

// Core Entities
export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  userId: string;
  companyId?: string;
  bibNumber: string;
  category: Category;
  gender: Gender;
  checkedIn: boolean;
  checkedInAt?: string;
  startedAt?: string;
  finishedAt?: string;
  totalDistance: number;
  finishTime?: number;
  pace?: number;
  treesCount: number;
  qrCodeUrl?: string;
  certificateUrl?: string;
  status: ParticipantStatus;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodGroup?: string;
  tshirtSize?: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  industry?: string;
  employeeCount?: number;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  date: string;
  status: EventStatus;
  totalDistance: number;
  registrationOpen: boolean;
  maxParticipants?: number;
}

export interface GpsPoint {
  participantId: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  altitude?: number;
  timestamp: string;
}

export interface SnappedPoint {
  lat: number;
  lng: number;
  routeDistance: number;
  distanceFromRoute: number;
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  bibNumber: string;
  companyName?: string;
  category: Category;
  gender: Gender;
  distance: number;
  pace: number;
  rank: number;
  status: ParticipantStatus;
}

export interface TreeCounter {
  totalTrees: number;
  totalKm: number;
  totalCO2: number;
}

// API Request/Response Types
export interface RegistrationRequest {
  name: string;
  email: string;
  phone: string;
  companyId?: string;
  companyName?: string;
  category: Category;
  gender: Gender;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodGroup?: string;
  tshirtSize?: string;
}

export interface RegistrationResponse {
  participant: Participant;
  qrCodeUrl: string;
  bibNumber: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Socket Event Types
export interface SocketEvents {
  'gps:update': GpsPoint;
  'runner:start': { participantId: string };
  'runner:pause': { participantId: string; reason?: string };
  'runner:finish': { participantId: string };
  'leaderboard:update': {
    category: string;
    top10: LeaderboardEntry[];
  };
  'runner:update': {
    participantId: string;
    lat: number;
    lng: number;
    distance: number;
    pace: number;
    rank: number;
    status: ParticipantStatus;
  };
  'trees:update': TreeCounter & { increment: number };
  announcement: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'emergency';
    timestamp: string;
  };
  'race:start': { eventId: string; startedAt: string; totalParticipants: number };
  'race:end': { eventId: string; endedAt: string; totalFinished: number; totalTrees: number };
}

// Dashboard Types
export interface DashboardStats {
  totalRegistered: number;
  totalCheckedIn: number;
  totalRunning: number;
  totalFinished: number;
  activeConnections: number;
  gpsUpdatesPerSecond: number;
  treesCount: number;
  co2Offset: number;
}

export interface CertificateData {
  participantName: string;
  bibNumber: string;
  category: Category;
  finishTime: number;
  rank: number;
  treesCount: number;
  eventName: string;
  eventDate: string;
}
