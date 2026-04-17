import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { RequireAiSecret } from "@/components/auth/RequireAiSecret";
import { AppTopNav } from "@/components/shell/AppTopNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Thinking Training",
  description: "Local-first thinking exercises and calibration in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: extensions (e.g. WOT wotdisconnected on body) mutate DOM before hydrate */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AppTopNav />
        <RequireAiSecret>
          <div className="flex flex-1 flex-col">{children}</div>
        </RequireAiSecret>
      </body>
    </html>
  );
}
