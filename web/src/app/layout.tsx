import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastLayout } from "@/components/providers/ToastLayout";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  /* Patch window.fetch so AbortError rejections (from real page navigations
     cancelling in-flight requests, incl. Next.js's own internal RSC/prefetch
     fetches) are marked "handled" before the microtask checkpoint, so they
     never become unhandledrejection noise in the console/devtools. A
     window-level unhandledrejection listener alone is NOT enough here:
     Next's dev error overlay attaches its own unhandledrejection listener
     that logs regardless of event.preventDefault(), so the only reliable
     fix is to keep the promise from ever going unhandled in the first place. */
  try{
    var f=window.fetch;
    if(f&&!f.__cogiAbortPatched){
      var orig=f.bind(window);
      var patched=function(){
        var p=orig.apply(this,arguments);
        p.catch(function(e){if(e&&typeof e==="object"&&e.name==="AbortError")return;throw e;});
        return p;
      };
      patched.__cogiAbortPatched=true;
      window.fetch=patched;
    }
  }catch(_){}
  /* Fallback for any non-fetch AbortError sources. */
  try{window.addEventListener("unhandledrejection",function(e){var r=e.reason;if(r&&typeof r==="object"&&r.name==="AbortError")e.preventDefault();},{capture:true});}catch(_){}
})();`,
          }}
        />
      </head>
      {/* suppressHydrationWarning: extensions (e.g. WOT wotdisconnected on body) mutate DOM before hydrate */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ToastLayout>
          <div className="flex flex-1 flex-col">{children}</div>
        </ToastLayout>
      </body>
    </html>
  );
}
