import { FirebaseAuthGate } from "@/components/auth/FirebaseAuthGate";
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
        <div className="flex flex-1 flex-col">{children}</div>
      </FirebaseAuthGate>
    </>
  );
}
