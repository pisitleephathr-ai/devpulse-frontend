import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

// Primary UI typeface — clean, modern, Thai + Latin.
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  applicationName: "DevPulse",
  title: "DevPulse — ระบบจัดการทีม",
  description: "ระบบปฏิบัติการประจำวันของทีมพัฒนาซอฟต์แวร์",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Makes iOS "Add to Home Screen" launch full-screen (standalone) with our
  // title + status-bar style, so it behaves like a native app shortcut.
  appleWebApp: {
    capable: true,
    title: "DevPulse",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  // Fill the notch/safe areas so standalone mode looks edge-to-edge.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="h-full" suppressHydrationWarning>
      <body
        className={`${notoSansThai.variable} ${geistMono.variable} min-h-full font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
