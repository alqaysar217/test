'use client';

import { useEffect } from 'react';

/**
 * مكون لتسجيل الـ Service Worker في المتصفح
 * لتمكين ميزات الـ PWA والتثبيت
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered: ', registration);
          },
          (registrationError) => {
            console.log('SW registration failed: ', registrationError);
          }
        );
      });
    }
  }, []);

  return null;
}