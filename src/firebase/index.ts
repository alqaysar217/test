'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * تهيئة Firebase مع تفعيل ميزة العمل بدون اتصال (Offline Persistence)
 * تم تعطيل Storage هنا لضمان بقاء المشروع مجانياً 100% وبدون طلب بطاقة ائتمان.
 */
export function initializeFirebase(): {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
} {
  const isValid = 
    firebaseConfig && 
    firebaseConfig.apiKey && 
    firebaseConfig.projectId;
  
  if (!isValid) {
    return { firebaseApp: null, firestore: null, auth: null };
  }

  try {
    const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    let firestore: Firestore;
    if (getApps().length === 0) {
      firestore = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      });
      // تفعيل التخزين المحلي لتحسين الأداء في ظروف الشبكة الضعيفة
      if (typeof window !== 'undefined') {
        enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
          console.warn("Firestore Persistence failed:", err.code);
        });
      }
    } else {
      firestore = getFirestore(firebaseApp);
    }

    const auth = getAuth(firebaseApp);

    return { firebaseApp, firestore, auth };
  } catch (error) {
    console.error("❌ فشل في تهيئة خدمات Firebase:", error);
    return { firebaseApp: null, firestore: null, auth: null };
  }
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
