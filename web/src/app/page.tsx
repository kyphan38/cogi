import { HomeContent } from "@/components/dashboard/HomeContent";

export default function Home() {
  // #region agent log
  fetch("http://127.0.0.1:7246/ingest/885cecb3-29b5-46db-8fa2-4c6c940007bf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "1161fc",
    },
    body: JSON.stringify({
      sessionId: "1161fc",
      runId: "pre-fix",
      hypothesisId: "H2-H3",
      location: "src/app/page.tsx:4",
      message: "home route server render",
      data: {
        cwd: process.cwd(),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return <HomeContent />;
}
