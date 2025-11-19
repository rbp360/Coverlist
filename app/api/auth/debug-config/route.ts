import { NextResponse } from 'next/server';

import { authAdmin } from '@/lib/firebaseAdmin';

export async function GET() {
  const env = process.env;
  const publicConfig = {
    NEXT_PUBLIC_AUTH_USE_FIREBASE: (env.NEXT_PUBLIC_AUTH_USE_FIREBASE || '').toLowerCase(),
    NEXT_PUBLIC_FIREBASE_API_KEY: !!env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: !!env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: !!env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: !!env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const serverConfig = {
    FIREBASE_PROJECT_ID: !!env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!env.FIREBASE_PRIVATE_KEY,
    adminReady: !!authAdmin,
    NODE_ENV: env.NODE_ENV,
  };
  return NextResponse.json({ publicConfig, serverConfig });
}
