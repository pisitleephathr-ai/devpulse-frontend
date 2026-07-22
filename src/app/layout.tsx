import type { Metadata } from "next";
import { Geist_Mono, Maitree } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Web fallback for the Angsana-New-first stack: a free Thai serif (looped,
// with feet) that reads close to Angsana New on devices that don't have it
// installed (Mac / iOS / Android / Linux). Windows/Office users get real
// Angsana New via the CSS font stack; this covers everyone else.
const thaiSerif = Maitree({
  variable: "--font-thai-serif",
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "DevPulse — ระบบจัดการทีม",
  description: "ระบบปฏิบัติการประจำวันของทีมพัฒนาซอฟต์แวร์",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="h-full" suppressHydrationWarning>
      <body
        className={`${thaiSerif.variable} ${geistMono.variable} min-h-full font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
