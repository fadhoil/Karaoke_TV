'use client';

import { useParams } from 'next/navigation';
import ControllerRoom from '@/components/ControllerRoom';

export default function JoinRoomPage() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? '').toUpperCase();

  return <ControllerRoom code={code} />;
}
