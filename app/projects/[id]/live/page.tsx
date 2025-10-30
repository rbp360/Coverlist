'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function RedirectToSetlists() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/projects/${id}/setlists`);
  }, [id, router]);
  return null;
}
