// Deprecated: Firebase reset links are handled via /auth/action now.
export default function ResetConfirmPage() {
  if (typeof window !== 'undefined') {
    window.location.replace('/auth/action');
  }
  return null;
}
