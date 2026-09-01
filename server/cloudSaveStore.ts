import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { GameSave, GoogleAccountProfile, SAVE_VERSION } from '../src/types/game';

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
}

interface CloudSaveRecord {
  googleSub: string;
  profile: GoogleAccountProfile;
  save: GameSave | null;
  updatedAt: number;
}

interface StoreShape {
  users: Record<string, CloudSaveRecord>;
}

const DATA_PATH = process.env.CLOUD_SAVE_DATA_PATH || path.join(process.cwd(), '.data', 'cloud-saves.json');
const SESSION_SECRET = process.env.CLOUD_SAVE_SECRET || 'dev-only-change-me';

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function safeParse<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export class CloudSaveStore {
  private data: StoreShape = { users: {} };
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() { this.load(); }

  private load() {
    try {
      if (fs.existsSync(DATA_PATH)) this.data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as StoreShape;
    } catch {
      this.data = { users: {} };
    }
  }

  private saveFile() {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
      await fs.promises.writeFile(DATA_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    }).catch(() => undefined);
  }

  async verifyGoogleCredential(credential: string): Promise<GoogleTokenInfo> {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google sign-in token could not be verified.');
    const info = await response.json() as GoogleTokenInfo;
    if (!info.sub || !info.email) throw new Error('Google sign-in token is missing account identity.');
    if (String(info.email_verified) === 'false') throw new Error('Google account email is not verified.');
    const configuredClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (configuredClientId && info.aud !== configuredClientId) throw new Error('Google token audience does not match this app.');
    return info;
  }

  createSessionToken(googleSub: string): string {
    const payload = base64Url(JSON.stringify({ sub: googleSub, iat: Date.now() }));
    return `${payload}.${sign(payload)}`;
  }

  verifySessionToken(token: string | undefined): string | null {
    if (!token || !token.includes('.')) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature || sign(payload) !== signature) return null;
    const decoded = safeParse<{ sub: string; iat: number }>(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded?.sub) return null;
    return decoded.sub;
  }

  upsertFromGoogle(info: GoogleTokenInfo, currentSave?: GameSave | null): CloudSaveRecord {
    const now = Date.now();
    const existing = this.data.users[info.sub];
    const profile: GoogleAccountProfile = {
      id: info.sub,
      email: info.email,
      name: info.name || info.email.split('@')[0],
      avatarUrl: info.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(info.email)}`,
      isLoggedIn: true,
      lastCloudSyncedAt: now
    };

    const normalizedSave = currentSave ? {
      ...currentSave,
      googleProfile: profile,
      saveVersion: SAVE_VERSION,
      updatedAt: currentSave.updatedAt || now
    } : null;

    const shouldKeepExisting = existing?.save && normalizedSave && (existing.save.updatedAt || 0) > (normalizedSave.updatedAt || 0);
    const record: CloudSaveRecord = {
      googleSub: info.sub,
      profile,
      save: shouldKeepExisting ? existing.save : (normalizedSave || existing?.save || null),
      updatedAt: shouldKeepExisting ? existing.updatedAt : now
    };
    this.data.users[info.sub] = record;
    this.saveFile();
    return record;
  }

  getSave(googleSub: string): CloudSaveRecord | null {
    return this.data.users[googleSub] || null;
  }

  writeSave(googleSub: string, save: GameSave): CloudSaveRecord {
    const now = Date.now();
    const existing = this.data.users[googleSub];
    if (!existing) throw new Error('Cloud profile not found. Please sign in again.');
    const profile = { ...existing.profile, lastCloudSyncedAt: now };
    const cleanSave: GameSave = {
      ...save,
      googleProfile: profile,
      saveVersion: SAVE_VERSION,
      updatedAt: now
    };
    const record: CloudSaveRecord = { googleSub, profile, save: cleanSave, updatedAt: now };
    this.data.users[googleSub] = record;
    this.saveFile();
    return record;
  }
}

export const cloudSaveStore = new CloudSaveStore();
