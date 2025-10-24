import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { exchangeCodeForToken } from '@/lib/spotifyAuth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const returnTo = new URLSearchParams(state).get('returnTo') || '/profile';

  const user = getCurrentUser();
  if (!user) {
    return NextResponse.redirect('/login');
  }
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  try {
    const tok = await exchangeCodeForToken(code);
    const expiresAt = Date.now() + (tok.expires_in - 30) * 1000;
    db.setUserSpotify(user.id, {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt,
      scope: tok.scope,
      tokenType: tok.token_type,
    });
    return NextResponse.redirect(returnTo);
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Token exchange failed', detail: e?.message },
      { status: 500 },
    );
  }
}
