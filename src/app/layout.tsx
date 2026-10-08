import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// TEMPORARY: Clerk disabled - no env vars
// import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { toasterProps } from '@/lib/toast-config';
import { Suspense } from 'react';

import { AttributionTracker } from '@/components/AttributionTracker';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cognition",
  description: "Analyze your life, understand your mind - Transform your conversations into meaningful insights about your emotional journey and relationships.",
  icons: {
    icon: [
      { url: '/favicon-landing-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-landing-dark.png', media: '(prefers-color-scheme: dark)' }
    ],
    shortcut: '/favicon-landing-light.png',
    apple: '/favicon-landing-light.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en">
        <head>
          {/* Add your own analytics / ad pixels here. */}
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning={true}
        >
          <Suspense fallback={null}>
            <AttributionTracker />
          </Suspense>
          {children}
          <Toaster {...toasterProps} />
        </body>
      </html>
    </>
  );
}
