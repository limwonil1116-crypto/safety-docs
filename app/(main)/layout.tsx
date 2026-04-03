import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <Header />
      <main className="pt-14 pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}