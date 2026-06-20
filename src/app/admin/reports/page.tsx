
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  FileSpreadsheet, 
  Filter, 
  Users,
  Loader2,
  TrendingUp,
  FileText,
  ShieldCheck,
  Building2,
  GraduationCap,
  UserCheck,
  Archive as ArchiveIcon,
  X,
  Calendar,
  School,
  Banknote
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection } from "firebase/firestore";

const COLORS = ['#0B3C5D', '#328CC1', '#4ade80', '#f97316', '#8b5cf6'];

export default function ReportsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("students");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Queries
  const studentsQuery = useMemo(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const archivesQuery = useMemo(() => firestore ? collection(firestore, "archives") : null, [firestore]);
  const usersQuery = useMemo(() => firestore ? collection(firestore, "users") : null, [firestore]);
  const deptsQuery = useMemo(() => firestore ? collection(firestore, "departments") : null, [firestore]);
  const collegesQuery = useMemo(() => firestore ? collection(firestore, "colleges") : null, [firestore]);
  const yearsQuery = useMemo(() => firestore ? collection(firestore, "academicYears") : null, [firestore]);

  const { data: students = [], loading: loadingStudents } = useCollection(studentsQuery);
  const { data: archives = [] } = useCollection(archivesQuery);
  const { data: staff = [] } = useCollection(usersQuery);
  const { data: departments = [] } = useCollection(deptsQuery);
  const { data: colleges = [] } = useCollection(collegesQuery);
  const { data: academicYears = [] } = useCollection(yearsQuery);

  const [exporting, setExporting] = useState(false);
  
  // Filters State
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterAdmission, setFilterAdmission] = useState("all");

  // Filtered Students Logic
  const filteredStudents = useMemo(() => {
    return (students as any[]).filter(s => {
      const matchCollege = filterCollege === "all" || s.collegeId === filterCollege;
      const matchDept = filterDept === "all" || s.departmentId === filterDept;
      const matchLevel = filterLevel === "all" || s.level === filterLevel;
      const matchYear = filterYear === "all" || s.academicYear === filterYear;
      const matchAdmission = filterAdmission === "all" || s.admissionType === filterAdmission;
      return matchCollege && matchDept && matchLevel && matchYear && matchAdmission;
    });
  }, [students, filterCollege, filterDept, filterLevel, filterYear, filterAdmission]);

  // Archive distribution for chart
  const archiveChartData = useMemo(() => {
    if (archives.length === 0) return [];
    
    const counts: Record<string, number> = {};
    archives.forEach((item: any) => {
      let deptName = item.departmentName;
      if (!deptName || deptName === "غير محدد") {
        const dept = (departments as any[]).find(d => d.id === item.departmentId);
        deptName = dept?.nameAr || dept?.name || "تخصص عام";
      }
      counts[deptName] = (counts[deptName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [archives, departments]);

  const formatNumber = (num: number) => {
    if (!mounted) return "0";
    return num.toLocaleString('en-US');
  };

  const handleExportCSV = (reportType: 'students' | 'staff' | 'archives') => {
    setExporting(true);
    try {
      let headers: string[] = [];
      let rows: any[][] = [];
      let fileName = "";

      if (reportType === 'students') {
        headers = ["الاسم الكامل", "رقم القيد", "الكلية", "التخصص", "المستوى", "نظام القبول"];
        rows = filteredStudents.map(s => [s.name, s.regId, s.collegeName || '---', s.departmentName, s.level, s.admissionType]);
        fileName = `تقرير_الطلاب_${new Date().toLocaleDateString('ar-EG')}.csv`;
      } else if (reportType === 'staff') {
        headers = ["الاسم", "اسم المستخدم", "الدور", "الحالة"];
        rows = (staff as any[]).map(u => [u.name, u.username, u.role === 'manager' ? 'مدير' : 'موظف', u.status === 'active' ? 'نشط' : 'موقوف']);
        fileName = `تقرير_العاملين_${new Date().toLocaleDateString('ar-EG')}.csv`;
      } else {
        headers = ["الطالب", "المادة", "الترم", "السنة"];
        rows = (archives as any[]).map(a => [a.studentName, a.subjectName, a.term, a.year]);
        fileName = `تقرير_الأرشفة_${new Date().toLocaleDateString('ar-EG')}.csv`;
      }

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "تم التصدير بنجاح" });
    } catch (error) {
      toast({ variant: "destructive", title: "خطأ في التصدير" });
    } finally {
      setExporting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-right">
          <h1 className="text-3xl font-black text-primary mb-1">المركز التحليلي المتقدم</h1>
          <p className="text-muted-foreground font-bold">تقارير شاملة عن الموارد البشرية والبيانات الأكاديمية</p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={() => handleExportCSV('students')}
            disabled={exporting || loadingStudents}
            className="rounded-xl h-12 border-2 gap-2 font-black text-primary hover:bg-primary/5"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            تصدير بيانات الطلاب
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExportCSV('archives')}
            disabled={exporting}
            className="rounded-xl h-12 border-2 gap-2 font-black text-primary hover:bg-primary/5"
          >
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            تصدير سجل الأرشفة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-none shadow-xl rounded-3xl bg-white border-r-8 border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Users className="w-6 h-6" /></div>
            <Badge className="bg-green-50 text-green-700 border-none font-black">قاعدة البيانات</Badge>
          </div>
          <p className="text-muted-foreground text-sm font-bold">إجمالي الطلاب</p>
          <h4 className="text-3xl font-black text-primary">{formatNumber(students.length)}</h4>
        </Card>
        
        <Card className="p-6 border-none shadow-xl rounded-3xl bg-white border-r-8 border-secondary">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-secondary/10 rounded-2xl text-secondary"><UserCheck className="w-6 h-6" /></div>
            <Badge className="bg-blue-50 text-blue-700 border-none font-black">القوى العاملة</Badge>
          </div>
          <p className="text-muted-foreground text-sm font-bold">إجمالي العاملين</p>
          <h4 className="text-3xl font-black text-primary">{formatNumber(staff.length)}</h4>
        </Card>

        <Card className="p-6 border-none shadow-xl rounded-3xl bg-white border-r-8 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-2xl text-orange-600"><FileText className="w-6 h-6" /></div>
            <Badge className="bg-orange-50 text-orange-700 border-none font-black">الأرشفة السحابية</Badge>
          </div>
          <p className="text-muted-foreground text-sm font-bold">إجمالي الاختبارات</p>
          <h4 className="text-3xl font-black text-primary">{formatNumber(archives.length)}</h4>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="bg-white p-1 rounded-2xl h-16 shadow-lg border mb-10 flex w-full max-w-2xl mx-auto">
          <TabsTrigger value="students" className={cn("flex-1 rounded-xl font-black text-sm transition-all gap-2", activeTab === "students" ? "gradient-blue text-white shadow-xl" : "text-muted-foreground")}><GraduationCap className="w-5 h-5" />تحليل الطلاب</TabsTrigger>
          <TabsTrigger value="staff" className={cn("flex-1 rounded-xl font-black text-sm transition-all gap-2", activeTab === "staff" ? "gradient-blue text-white shadow-xl" : "text-muted-foreground")}><ShieldCheck className="w-5 h-5" />تقارير العاملين</TabsTrigger>
          <TabsTrigger value="archives" className={cn("flex-1 rounded-xl font-black text-sm transition-all gap-2", activeTab === "archives" ? "gradient-blue text-white shadow-xl" : "text-muted-foreground")}><ArchiveIcon className="w-5 h-5" />إحصائيات الأرشيف</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6 animate-slide-up">
          <Card className="p-8 border-none shadow-xl rounded-3xl bg-white mb-6">
            <div className="flex items-center gap-3 mb-8 border-b pb-4">
              <Filter className="w-6 h-6 text-secondary" />
              <h3 className="text-xl font-black text-primary">تصفية التقارير الذكية</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary flex items-center gap-2"><Calendar className="w-4 h-4 text-secondary" />السنة الدراسية</Label>
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full h-11 px-4 rounded-xl border-2 border-muted bg-muted/20 font-bold outline-none focus:border-primary text-right">
                  <option value="all">كافة السنوات</option>
                  {academicYears.map((y: any) => <option key={y.id} value={y.label}>{y.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary flex items-center gap-2"><School className="w-4 h-4 text-secondary" />الكلية</Label>
                <select value={filterCollege} onChange={(e) => { setFilterCollege(e.target.value); setFilterDept('all'); }} className="w-full h-11 px-4 rounded-xl border-2 border-muted bg-muted/20 font-bold outline-none focus:border-primary text-right">
                  <option value="all">كافة الكليات</option>
                  {colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary flex items-center gap-2"><Building2 className="w-4 h-4 text-secondary" />التخصص</Label>
                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-full h-11 px-4 rounded-xl border-2 border-muted bg-muted/20 font-bold outline-none focus:border-primary text-right">
                  <option value="all">كافة التخصصات</option>
                  {departments.filter((d: any) => filterCollege === 'all' || d.collegeId === filterCollege).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary flex items-center gap-2"><GraduationCap className="w-4 h-4 text-secondary" />المستوى</Label>
                <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="w-full h-11 px-4 rounded-xl border-2 border-muted bg-muted/20 font-bold outline-none focus:border-primary text-right">
                  <option value="all">كافة المستويات</option>
                  <option value="المستوى الأول">الأول</option><option value="المستوى الثاني">الثاني</option><option value="المستوى الثالث">الثالث</option><option value="المستوى الرابع">الرابع</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary flex items-center gap-2"><Banknote className="w-4 h-4 text-secondary" />نوع القبول</Label>
                <select value={filterAdmission} onChange={(e) => setFilterAdmission(e.target.value)} className="w-full h-11 px-4 rounded-xl border-2 border-muted bg-muted/20 font-bold outline-none focus:border-primary text-right">
                  <option value="all">كافة الأنواع</option>
                  <option value="عام">عام</option><option value="موازي">موازي</option><option value="نفقة خاصة">نفقة خاصة</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => { setFilterCollege('all'); setFilterDept('all'); setFilterLevel('all'); setFilterYear('all'); setFilterAdmission('all'); }} className="text-muted-foreground font-bold hover:text-primary gap-2">
                <X className="w-4 h-4" /> إعادة تعيين الفلاتر
              </Button>
            </div>
          </Card>

          <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
            <div className="p-6 border-b bg-muted/10 flex items-center justify-between">
              <h3 className="font-black text-primary flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-secondary" />
                قائمة الطلاب المستخرجة ({filteredStudents.length})
              </h3>
            </div>
            <Table className="text-right">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right font-black text-primary">اسم الطالب</TableHead>
                  <TableHead className="text-right font-black text-primary">رقم القيد</TableHead>
                  <TableHead className="text-right font-black text-primary">التخصص</TableHead>
                  <TableHead className="text-right font-black text-primary">نظام القبول</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-bold text-primary">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">{s.regId}</TableCell>
                    <TableCell className="font-bold text-xs text-secondary">{s.departmentName}</TableCell>
                    <TableCell><Badge variant="outline" className="font-black text-[10px] border-primary text-primary">{s.admissionType}</Badge></TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="h-40 text-center font-bold opacity-30">لا توجد بيانات مطابقة</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6 animate-slide-up">
           <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
            <div className="p-6 border-b bg-muted/10">
              <h3 className="font-black text-primary flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-secondary" />تقرير الموظفين</h3>
            </div>
            <Table className="text-right">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right font-black text-primary">الاسم</TableHead>
                  <TableHead className="text-right font-black text-primary">الدور</TableHead>
                  <TableHead className="text-right font-black text-primary">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-bold text-primary">{u.name}</TableCell>
                    <TableCell><Badge className={u.role === 'manager' ? "bg-primary" : "bg-secondary"}>{u.role === 'manager' ? 'مدير' : 'موظف'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-bold">{u.status === 'active' ? 'نشط' : 'موقوف'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="archives" className="space-y-8 animate-slide-up">
          <Card className="p-8 border-none shadow-xl rounded-3xl bg-white">
            <h3 className="text-lg font-black text-primary mb-8 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-secondary" /> توزيع الأرشفة حسب التخصص
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={archiveChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#0B3C5D', fontWeight: '900'}} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} orientation="right" />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', direction: 'rtl' }} />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={50}>
                    {archiveChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

