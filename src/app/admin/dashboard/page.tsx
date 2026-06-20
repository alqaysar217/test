
"use client";

import { useMemo, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Archive, 
  Clock, 
  ArrowUpRight, 
  GraduationCap,
  Loader2,
  TrendingUp,
  School,
  PieChart as PieChartIcon,
  Activity,
  ShieldCheck,
  Zap,
  ArrowDownRight,
  MoreVertical
} from "lucide-react";
import { 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import { cn } from "@/lib/utils";

// Firebase logic included in imports
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";

const COLORS = ['#0B3C5D', '#328CC1', '#4ade80', '#fbbf24'];

export default function AdminDashboard() {
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // استعلامات البيانات الحية
  const studentsQuery = useMemo(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const archivesQuery = useMemo(() => firestore ? collection(firestore, "archives") : null, [firestore]);
  const collegesQuery = useMemo(() => firestore ? collection(firestore, "colleges") : null, [firestore]);
  const recentQuery = useMemo(() => firestore ? query(collection(firestore, "archives"), orderBy("uploadedAt", "desc"), limit(6)) : null, [firestore]);

  const { data: students = [] } = useCollection(studentsQuery);
  const { data: archives = [], loading: loadingArchives } = useCollection(archivesQuery);
  const { data: colleges = [] } = useCollection(collegesQuery);
  const { data: recentActivity = [] } = useCollection(recentQuery);

  const stats = [
    { label: 'إجمالي الطلاب', value: students.length, icon: GraduationCap, trend: '+12.5%', isUp: true },
    { label: 'إجمالي الاختبارات', value: archives.length, icon: FileText, trend: '+8.2%', isUp: true },
    { label: 'الكليات المسجلة', value: colleges.length, icon: School, trend: 'مستقر', isUp: true },
    { label: 'نشاط النظام', value: '94%', icon: Activity, trend: '-2.1%', isUp: false },
  ];

  const chartData = [
    { name: 'يناير', value: 400 },
    { name: 'فبراير', value: 550 },
    { name: 'مارس', value: 800 },
    { name: 'أبريل', value: 720 },
    { name: 'مايو', value: archives.length > 0 ? (archives.length * 10) + 400 : 900 },
  ];

  const distributionData = [
    { name: 'تقنية معلومات', value: 45 },
    { name: 'علوم حاسوب', value: 30 },
    { name: 'هندسة برمجيات', value: 25 },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-8 text-right animate-fade-in" dir="rtl">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-muted/50">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-6 rounded-full gradient-blue"></div>
            <h1 className="text-3xl font-black text-primary tracking-tight">الرؤية الاستراتيجية</h1>
          </div>
          <p className="text-muted-foreground font-bold text-base pr-4">المركز القيادي لإدارة ومراقبة كافة العمليات الأكاديمية</p>
        </div>
      </div>

      {/* Stats Grid - Unified Style & 10px Radius */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="relative p-6 border-none shadow-xl rounded-[10px] bg-white hover:shadow-blue-50 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-6">
              <div className="p-3.5 rounded-[10px] text-white shadow-md gradient-blue transition-transform duration-300 group-hover:scale-105">
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[10px] font-black",
                stat.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-red-600"
              )}>
                {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
            <div>
              <h3 className="text-muted-foreground text-[11px] font-black uppercase tracking-wider mb-1">{stat.label}</h3>
              <p className="text-3xl font-black text-primary tracking-tighter">
                {typeof stat.value === 'number' ? stat.value.toLocaleString('en-US') : stat.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Advanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-none shadow-xl rounded-[10px] bg-white relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between mb-10">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-primary flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-secondary" />
                تحليلات الأداء السنوي
              </h2>
              <p className="text-muted-foreground font-bold text-xs">معدل نمو الأرشفة الرقمية وتدفق البيانات</p>
            </div>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#328CC1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#328CC1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="name" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{fill: '#94a3b8', fontWeight: 'bold'}} 
                  dy={10}
                />
                <YAxis 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{fill: '#94a3b8', fontWeight: 'bold'}} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', direction: 'rtl', textAlign: 'right' }}
                  labelStyle={{ fontWeight: '900', color: '#0B3C5D' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#328CC1" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 border-none shadow-xl rounded-[10px] bg-white flex flex-col items-center">
          <div className="w-full text-right mb-6">
            <h2 className="text-xl font-black text-primary flex items-center gap-3">
              <PieChartIcon className="w-6 h-6 text-orange-500" />
              توزيع الموارد
            </h2>
          </div>
          <div className="relative h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={6} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-2.5 mt-4">
            {distributionData.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-[8px] bg-muted/20 border border-transparent hover:border-muted transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                  <span className="text-[11px] font-black text-primary">{d.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Operational Pulse Section - Full Width & 10px Radius */}
      <Card className="p-8 border-none shadow-xl rounded-[10px] bg-white group">
        <div className="flex items-center justify-between mb-8 border-b border-muted/50 pb-5">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-primary flex items-center gap-3">
              <Activity className="w-6 h-6 text-secondary" />
              نبض النظام المباشر
            </h2>
            <p className="text-muted-foreground font-bold text-xs">آخر العمليات الإدارية المنفذة في الوقت الحقيقي</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50"><MoreVertical className="w-4 h-4 text-muted-foreground" /></Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingArchives ? (
            <div className="col-span-full flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>
          ) : recentActivity.length > 0 ? recentActivity.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-5 p-4 rounded-[10px] hover:bg-muted/10 transition-all border border-transparent hover:border-muted group/item">
              <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shadow-sm gradient-blue text-white group-hover/item:scale-105 transition-transform shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-primary font-black text-base truncate">
                  {item.studentName} <span className="text-muted-foreground font-bold text-xs mx-1">أرشفة:</span> {item.subjectName}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[10px] font-black text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.uploadedAt?.toDate ? item.uploadedAt.toDate().toLocaleTimeString('ar-EG-u-nu-latn') : 'الآن'}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                  <span className="flex items-center gap-1 text-secondary"><ShieldCheck className="w-3 h-3" />موظف أرشفة</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-16 bg-muted/5 rounded-[10px] border-2 border-dashed">
               <Archive className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
               <p className="text-muted-foreground font-black text-lg">لا توجد عمليات نشطة حالياً</p>
            </div>
          )}
        </div>
        
        <Button className="w-full mt-8 h-12 rounded-[10px] font-black bg-muted/20 text-primary hover:bg-muted/30 transition-colors" onClick={() => window.location.href='/admin/logs'}>
          مراجعة سجل الأنشطة الكامل
        </Button>
      </Card>
    </div>
  );
}
