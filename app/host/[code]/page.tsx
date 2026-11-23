'use client';

import { useParams } from 'next/navigation';
import HostRoom from '@/components/HostRoom';

export default function HostRoomPage() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? '').toUpperCase();

  return <HostRoom code={code} />;
}
