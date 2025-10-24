import { NextResponse } from 'next/server';

import { getSpotifyAuthUrl, SPOTIFY_SCOPES } from '@/lib/spotifyAuth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('returnTo') || '/profile';
  const state = new URLSearchParams({ returnTo }).toString();
  // State is URL-encoded key=value to allow returning to previous page
  const url = getSpotifyAuthUrl(state);
  return NextResponse.redirect(url);
}
