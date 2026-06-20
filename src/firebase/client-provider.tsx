'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [instances, setInstances] = useState<ReturnType<
    typeof initializeFirebase
  > | null>(null);

  useEffect(() => {
    setInstances(initializeFirebase());
  }, []);

  if (!instances) return <>{children}</>;

  return (
    <FirebaseProvider
      firebaseApp={instances.firebaseApp}
      firestore={instances.firestore}
      auth={instances.auth}
    >
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
