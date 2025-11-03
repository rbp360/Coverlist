import { getCurrentUser } from './auth';
import { db } from './db';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';

// Determine base URL dynamically for local vs production
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://coverlist-m8kpsaldt-robs-projects-c826db47.vercel.app'
    : 'http://127.0.0.1:3001');

// Always point redirect to the API callback route
export const SPOTIFY_REDIRECT_URI = `${BASE_URL}/api/integrations/spotify/callback`;

export const SPOTIFY_SCOPES = ['playlist-modify-public', 'playlist-modify-private'].join(' ');

function ensureSpotifyEnv() {
  const missing: string[] = [];
  if (!SPOTIFY_CLIENT_ID) missing.push('SPOTIFY_CLIENT_ID');
  if (!SPOTIFY_CLIENT_SECRET) missing.push('SPOTIFY_CLIENT_SECRET');
  if (missing.length) {
    throw new Error(
      `spotify_env_missing:${missing.join(',')}. Set these in env and ensure NEXT_PUBLIC_BASE_URL is configured.`,
    );
  }
}

export function getSpotifyAuthUrl(state?: string) {
  ensureSpotifyEnv();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID!,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
  });
  if (state) params.set('state', state);
  return `${SPOTIFY_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  ensureSpotifyEnv();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID!,
    client_secret: SPOTIFY_CLIENT_SECRET!,
  });
  const res = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token exchange failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json as {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number; // seconds
    refresh_token: string;
  };
}

export async function refreshAccessToken(userId: string) {
  const current = db.getUserSpotify(userId);
  if (!current?.refreshToken) throw new Error('No refresh token');
  ensureSpotifyEnv();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: current.refreshToken,
    client_id: SPOTIFY_CLIENT_ID!,
    client_secret: SPOTIFY_CLIENT_SECRET!,
  });
  const res = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify refresh failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    token_type: string;
    scope?: string;
    expires_in: number;
    refresh_token?: string; // may be absent
  };
  const expiresAt = Date.now() + (json.expires_in - 30) * 1000; // small skew
  db.setUserSpotify(userId, {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || current.refreshToken,
    expiresAt,
    scope: json.scope || current.scope,
    tokenType: json.token_type,
  });
  return db.getUserSpotify(userId)!;
}

export async function getValidSpotifyAuth() {
  const user = getCurrentUser();
  if (!user) throw new Error('auth_required');
  const tokens = db.getUserSpotify(user.id);
  if (!tokens) throw new Error('spotify_auth_required');
  if (Date.now() > tokens.expiresAt - 5_000) {
    try {
      return await refreshAccessToken(user.id);
    } catch (e) {
      throw new Error('spotify_auth_required');
    }
  }
  return tokens;
}

export async function fetchSpotify(path: string, init: RequestInit & { userId?: string } = {}) {
  const user = getCurrentUser();
  if (!user) throw new Error('auth_required');
  let tokens = db.getUserSpotify(user.id);
  if (!tokens) throw new Error('spotify_auth_required');
  if (Date.now() > tokens.expiresAt - 5_000) {
    tokens = await refreshAccessToken(user.id);
  }

  let attempt = 0;
  const maxAttempts = 3;
  let url = path.startsWith('http') ? path : `https://api.spotify.com${path}`;

  while (attempt < maxAttempts) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '1', 10);
      await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
      attempt++;
      continue;
    }
    if (res.status === 401 && attempt === 0) {
      // Access token expired unexpectedly, try one refresh then retry
      tokens = await refreshAccessToken(user.id);
      attempt++;
      continue;
    }
    return res;
  }
  // final try
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}
