
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Archive, 
  LogOut,
  ChevronLeft,
  GraduationCap,
  ClipboardCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebarToggle } from "@/components/providers/SidebarProvider";

const menuItems = [
  { label: 'الرئيسية', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'رفع اختبار', icon: UploadCloud, href: '/upload' },
  { label: 'الأرشيف', icon: Archive, href: '/archive' },
  { label: 'إدارة الطلاب', icon: GraduationCap, href: '/students' },
  { label: 'إدارة التظلمات', icon: ClipboardCheck, href: '/grievances' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen } = useSidebarToggle();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem('userSession');
    if (session) {
      setCurrentUser(JSON.parse(session));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    router.push('/');
  };

  return (
    <aside className={cn(
      "w-64 h-screen bg-primary text-white hidden md:flex flex-col fixed right-0 top-0 z-40 border-l border-white/10 shadow-2xl transition-all duration-300 transform",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="p-8 flex items-center gap-4">
        <div className="relative w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden shadow-lg shrink-0">
          <Image src="/logo-mustand.png" alt="Logo" fill className="object-cover" />
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xl font-black tracking-tight">مستند</span>
          <span className="text-[10px] text-white/50 font-bold">نظام الأرشفة الذكي</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon as any;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group text-right",
                isActive 
                  ? "bg-white text-primary shadow-lg font-bold" 
                  : "hover:bg-white/10 text-white/70 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform", !isActive && "group-hover:scale-110")} />
              <span className="font-bold flex-1">{item.label}</span>
              {isActive && <ChevronLeft className="w-4 h-4 mr-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 shadow-xl">
          <div className="flex items-center gap-3 mb-2.5 text-right">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/30 shadow-md shrink-0">
              <Image src={currentUser?.avatar || "/emploeed-1.png"} alt="Profile" fill className="object-cover" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate text-white leading-tight">{currentUser?.name || "موظف"}</p>
              <p className="text-[9px] text-white/60 truncate font-bold uppercase tracking-wider">موظف أرشفة</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-center bg-white/5 hover:bg-destructive hover:text-white text-white/80 rounded-xl h-9 font-black transition-all gap-2 border border-white/5 text-[10px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
