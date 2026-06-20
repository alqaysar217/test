import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SidebarProvider } from '@/components/providers/SidebarProvider';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'مستند | نظام الأرشفة الذكي',
  description: 'نظام إدارة وأرشفة الاختبارات الذكي مع استخراج البيانات تلقائياً',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'مستند',
    startupImage: [
      '/apple-splash.png'
    ],
  },
  icons: {
    icon: '/logo-mustand.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B3C5D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        
        {/* إعدادات iOS الاحترافية */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="مستند" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* منع التكبير التلقائي عند الضغط على الحقول في الآيفون */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <FirebaseClientProvider>
          <SidebarProvider>
            <PWARegister />
            {children}
            <Toaster />
          </SidebarProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}