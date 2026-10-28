import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/env";
import { ThemeProvider } from "@/components/portfolio/theme-provider";
import { CustomCursor } from "@/components/ui/custom-cursor";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "Portfolio", template: "%s" },
  applicationName: "Portfolio",
  formatDetection: { telephone: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#080d19" },
  ],
  colorScheme: "light dark",
};

/**
 * Inline script that runs before React hydration to apply the saved theme
 * class to <html>. Prevents a flash of the wrong theme on page load.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('portfolio-theme');var d=t==='light'?false:true;if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${geistSans.variable} ${geistMono.variable} antialiased`}>
      {/* Anti-flash: runs synchronously before any paint */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-paper text-ink">
        <ThemeProvider>
          {children}
          <CustomCursor />
        </ThemeProvider>
      </body>
    </html>
  );
}
