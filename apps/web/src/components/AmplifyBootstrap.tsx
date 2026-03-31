'use client';

import '@/lib/amplify-config';

export default function AmplifyBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
