import { query, queryOne } from './db';
import crypto from 'crypto';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
  role: string;
}

export interface Session {
  id: number;
  session_id: string;
  user_id: number;
  created_at: Date;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

// Hash password
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Verify password
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate secure session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create new session
export async function createSession(userId: number, ipAddress?: string, userAgent?: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await query(`
    INSERT INTO sessions (session_id, user_id, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `, [sessionId, userId, expiresAt, ipAddress || null, userAgent || null]);

  return sessionId;
}

// Get session by ID
export async function getSession(sessionId: string): Promise<Session | null> {
  const session = await queryOne<Session>(`
    SELECT * FROM sessions 
    WHERE session_id = ? AND expires_at > NOW() AND is_active = TRUE
  `, [sessionId]);

  return session;
}

// Get user by session
export async function getUserBySession(sessionId: string): Promise<User | null> {
  const user = await queryOne<User>(`
    SELECT u.* FROM users u
    JOIN sessions s ON u.id = s.user_id
    WHERE s.session_id = ? AND s.expires_at > NOW() AND s.is_active = TRUE
  `, [sessionId]);

  return user;
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
  const user = await queryOne<User>(`
    SELECT * FROM users WHERE username = ? AND is_active = TRUE
  `, [username]);

  return user;
}

// Authenticate user
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  
  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }

  // Update last login
  await query(`
    UPDATE users SET last_login = NOW() WHERE id = ?
  `, [user.id]);

  return user;
}

// Delete session (logout)
export async function deleteSession(sessionId: string): Promise<void> {
  await query(`
    UPDATE sessions 
    SET is_active = FALSE 
    WHERE session_id = ?
  `, [sessionId]);
}

// Check if user has role
export function hasRole(user: User | null, role: string): boolean {
  if (!user) return false;
  return user.role === role;
}

// Check if user has any of the roles
export function hasAnyRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Get user permissions
export function getUserPermissions(user: User | null): string[] {
  if (!user) return [];
  
  const permissions: string[] = [];
  
  if (user.role === 'admin') {
    permissions.push('manage_users', 'manage_content', 'manage_roles', 'view_analytics');
  } else if (user.role === 'moderator') {
    permissions.push('manage_content', 'view_analytics');
  } else {
    permissions.push('view_content');
  }
  
  return permissions;
}

// Clean expired sessions
export async function cleanExpiredSessions(): Promise<void> {
  await query(`
    UPDATE sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW()
  `);
}
