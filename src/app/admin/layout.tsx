
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { useSidebarToggle } from "@/components/providers/SidebarProvider";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen } = useSidebarToggle();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('userSession');
    if (!session) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(session);
    // حماية المسار: فقط المدير يمكنه البقاء في مجلد admin
    if (userData.role !== 'manager') {
      router.push('/dashboard'); // توجيه الموظف للوحة التحكم الخاصة به
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <AdminSidebar />
      <div className="flex flex-col">
        <AdminNavbar />
        <main className={cn(
          "transition-all duration-300 p-6 md:p-10 animate-fade-in",
          isOpen ? "mr-0 md:mr-64" : "mr-0"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
