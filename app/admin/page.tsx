import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "관리자 | 주간 랭킹",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col bg-[linear-gradient(180deg,#eef8f6_0%,#f8fafc_50%,#f1f5f9_100%)]">
      <AdminApp />
    </main>
  );
}
