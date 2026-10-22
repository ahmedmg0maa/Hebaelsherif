import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { MotionPreferenceController } from "@/components/motion/MotionToggle";

// A nonce-bearing HTML shell must be rendered per request in both adapters.
export const dynamic = 'force-dynamic';

// Mobile-first viewport: notch-safe rendering + branded status bar on Android/iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDE1CB" },
    { media: "(prefers-color-scheme: dark)", color: "#0E3440" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "هبة الشريف — منصة التعلّم والتطوير",
    template: "%s | هبة الشريف",
  },
  description:
    "منصة هبة الشريف: دورات، كتب، ورش عمل، وجلسات فردية لرحلة تطوّر واعية.",
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: "هبة الشريف",
    title: "هبة الشريف — منصة التعلّم والتطوير",
    description: "دورات، كتب، ورش عمل، وجلسات فردية لرحلة تطوّر واعية.",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/brand/main-logo.png",
    apple: "/brand/main-logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "هبة الشريف",
    statusBarStyle: "default",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            // A first visit is deliberately light. The device preference must
            // not silently turn the whole brand experience dark; only an
            // explicit choice made with the theme control is persisted.
            __html: `(function(){try{var d=localStorage.getItem('heba-theme')==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';document.documentElement.dataset.motion='system'}catch(e){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col"><MotionPreferenceController />{children}</body>
    </html>
  );
}
