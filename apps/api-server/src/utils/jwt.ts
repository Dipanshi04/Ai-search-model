import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  RESET_TOKEN_EXPIRY: '1h',
};

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface ResetTokenPayload {
  hrId: string;
  email: string;
  type: 'hr_password_reset';
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
  } as jwt.SignOptions);
}

export function generateResetToken(payload: ResetTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: JWT_CONFIG.RESET_TOKEN_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}

export function verifyResetToken(token: string): ResetTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as ResetTokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
