import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
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
  title: "cogi",
  description: "cogi thinking practice app.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/branding/cogi-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{window.addEventListener("unhandledrejection",function(e){var r=e.reason;if(r&&typeof r==="object"&&r.name==="AbortError")e.preventDefault();},{capture:true});}catch(_){}})();`,
          }}
        />
      </head>
      {/* suppressHydrationWarning: extensions (e.g. WOT wotdisconnected on body) mutate DOM before hydrate */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
