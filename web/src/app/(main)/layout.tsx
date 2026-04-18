import { FirebaseAuthGate } from "@/components/auth/FirebaseAuthGate";
import { MainScrollRestoration } from "@/components/providers/MainScrollRestoration";
import { AppTopNav } from "@/components/shell/AppTopNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppTopNav />
      <FirebaseAuthGate>
        <MainScrollRestoration />
        <div className="flex flex-1 flex-col">{children}</div>
      </FirebaseAuthGate>
    </>
  );
}
