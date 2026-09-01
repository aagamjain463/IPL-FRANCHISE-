import { GameSave, GoogleAccountProfile } from '../types/game';

const SESSION_KEY = 'ipl_google_session_token';
const PROFILE_KEY = 'google_cloud_synced_profile';

export interface GoogleCloudResponse {
  success: boolean;
  profile?: GoogleAccountProfile;
  cloudSave?: GameSave | null;
  sessionToken?: string;
  updatedAt?: number;
  error?: string;
}

export const GoogleCloudSaveClient = {
  getClientId(): string {
    return ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '') as string;
  },

  getSessionToken(): string | null {
    try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
  },

  saveSession(token: string, profile: GoogleAccountProfile) {
    try {
      localStorage.setItem(SESSION_KEY, token);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore storage errors
    }
  },

  clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      // ignore
    }
  },

  async signInWithCredential(credential: string, currentSave?: GameSave | null): Promise<GoogleCloudResponse> {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, currentSave })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Google sign-in failed' };
      if (data.sessionToken && data.profile) this.saveSession(data.sessionToken, data.profile);
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  },

  async loadCloudSave(): Promise<GoogleCloudResponse> {
    const token = this.getSessionToken();
    if (!token) return { success: false, error: 'Not signed in' };
    try {
      const res = await fetch('/api/cloud-save', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Cloud save unavailable' };
      if (data.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  },

  async saveCloudGame(save: GameSave): Promise<GoogleCloudResponse> {
    const token = this.getSessionToken();
    if (!token) return { success: false, error: 'Not signed in' };
    try {
      const res = await fetch('/api/cloud-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ save })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Cloud save failed' };
      if (data.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }
};

export function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Browser unavailable'));
    if ((window as any).google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google sign-in')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in'));
    document.head.appendChild(script);
  });
}
