
"use client";

import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  List, 
  Eye, 
  Filter, 
  Search,
  Calendar,
  Loader2,
  Trash2,
  BookOpen,
  X,
  Building2,
  GraduationCap,
  Fingerprint,
  Clock,
  Download,
  FileText,
  AlertTriangle,
  PlayCircle,
  Edit2,
  Save,
  UserPlus,
  Layers,
  RefreshCw
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSidebarToggle } from "@/components/providers/SidebarProvider";
import { downloadFile } from "@/lib/storage-utils";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function ArchivePage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [viewingExam, setViewingExam] = useState<any>(null);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [isSearchTriggered, setIsSearchTriggered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { isOpen } = useSidebarToggle();
  
  const firestore = useFirestore();

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");

  useEffect(() => {
    setIsSearchTriggered(false);
  }, [searchTerm, selectedYear, selectedDept, selectedLevel, selectedTerm, selectedSubject]);
  
  const archivesQuery = useMemo(() => (firestore && isSearchTriggered) ? collection(firestore, "archives") : null, [firestore, isSearchTriggered]);
  const deptsQuery = useMemo(() => firestore ? collection(firestore, "departments") : null, [firestore]);
  const yearsQuery = useMemo(() => firestore ? collection(firestore, "academicYears") : null, [firestore]);
  const subjectsQuery = useMemo(() => firestore ? collection(firestore, "subjects") : null, [firestore]);

  const { data: archives = [], loading } = useCollection(archivesQuery);
  const { data: departments = [] } = useCollection(deptsQuery);
  const { data: academicYears = [] } = useCollection(yearsQuery);
  const { data: allSubjects = [] } = useCollection(subjectsQuery);

  // Filtered Subjects based on selections
  const availableSubjectsForFilter = useMemo(() => {
    return (allSubjects as any[]).filter(s => {
      const matchDept = selectedDept === "all" || s.departmentId === selectedDept;
      const matchLevel = selectedLevel === "all" || s.level === selectedLevel;
      const matchTerm = selectedTerm === "all" || s.term === selectedTerm;
      return matchDept && matchLevel && matchTerm;
    });
  }, [allSubjects, selectedDept, selectedLevel, selectedTerm]);

  const processedResults = useMemo(() => {
    if (!isSearchTriggered) return [];
    return (archives as any[]).filter((item: any) => {
      const sName = (item.studentName || "").toLowerCase();
      const sId = (item.studentRegId || "").toLowerCase();
      const subName = (item.subjectName || "").toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = sName.includes(search) || sId.includes(search) || subName.includes(search);
      const matchesYear = selectedYear === "all" || item.year === selectedYear;
      const matchesDept = selectedDept === "all" || item.departmentId === selectedDept;
      const matchesLevel = selectedLevel === "all" || item.level === selectedLevel;
      const matchesTerm = selectedTerm === "all" || item.term === selectedTerm;
      const matchesSubject = selectedSubject === "all" || item.subjectId === selectedSubject;

      return matchesSearch && matchesYear && matchesDept && matchesLevel && matchesTerm && matchesSubject;
    });
  }, [archives, searchTerm, selectedYear, selectedDept, selectedLevel, selectedTerm, selectedSubject, isSearchTriggered]);

  const handleDownload = async (item: any) => {
    const data = item.file_data || item.fileUrl;
    if (!data) return;
    toast({ title: "جاري تحميل الملف..." });
    const fileName = `${item.studentName}_${item.subjectName}`;
    const result = await downloadFile(data, fileName);
    if (!result.success) {
      toast({ variant: "destructive", title: "فشل التحميل" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "archives", id));
      toast({ variant: "destructive", title: "تم حذف السجل بنجاح" });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  const handleUpdate = async () => {
    if (!firestore || !editingExam) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, "archives", editingExam.id);
      const { id, ...updateData } = editingExam;
      await updateDoc(docRef, { ...updateData, updatedAt: serverTimestamp() });
      toast({ title: "تم تحديث البيانات بنجاح" });
      setEditingExam(null);
    } catch (error) {
      toast({ variant: "destructive", title: "فشل التحديث" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-right" dir="rtl">
      <Sidebar />
      <Navbar />
      
      <main className={cn("transition-all duration-300 p-4 md:p-10", isOpen ? "mr-0 md:mr-64" : "mr-0")}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div><h1 className="text-3xl font-black text-primary mb-1">الأرشيف المركزي</h1><p className="text-muted-foreground font-bold text-sm">إدارة وقراءة دفاتر الطلاب الموثقة</p></div>
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border">
            <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')} className={cn("rounded-xl px-4 gap-2 h-9", view === 'grid' && "gradient-blue shadow-md text-white")}><LayoutGrid className="w-4 h-4" />شبكة</Button>
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')} className={cn("rounded-xl px-4 gap-2 h-9", view === 'list' && "gradient-blue shadow-md text-white")}><List className="w-4 h-4" />قائمة</Button>
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <Card className="p-3 md:p-4 rounded-[2rem] shadow-xl border-none bg-white flex flex-col md:flex-row items-center gap-4">
            <div className="flex-[3] relative w-full">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="اسم الطالب، رقم القيد، أو اسم المادة..." className="w-full h-12 md:h-14 pr-12 pl-4 rounded-2xl border-none bg-muted/20 outline-none focus:ring-2 focus:ring-primary font-bold text-sm" />
            </div>
            <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(!showFilters)} className="h-12 md:h-14 w-full md:w-auto rounded-2xl px-8 border-2 font-black gap-2">
              <Filter className="w-5 h-5" /> تصفية
            </Button>
          </Card>

          {showFilters && (
            <Card className="p-6 md:p-8 rounded-[2rem] shadow-lg border-none bg-white animate-slide-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">السنة الدراسية</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold"><SelectValue placeholder="كافة السنوات" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="all">كافة السنوات</SelectItem>
                    {academicYears.map((y: any) => <SelectItem key={y.id} value={y.label}>{y.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">التخصص</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold"><SelectValue placeholder="كافة التخصصات" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="all">كافة التخصصات</SelectItem>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr || d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">المستوى</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold"><SelectValue placeholder="كافة المستويات" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="all">كافة المستويات</SelectItem>
                    {["المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع", "المستوى الخامس"].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">الفصل الدراسي</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold"><SelectValue placeholder="كافة الأترام" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="all">كافة الأترام</SelectItem>
                    <SelectItem value="الفصل الأول">الفصل الأول</SelectItem>
                    <SelectItem value="الفصل الثاني">الفصل الثاني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">المادة</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold"><SelectValue placeholder="كافة المواد" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="all">كافة المواد</SelectItem>
                    {availableSubjectsForFilter.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => setIsSearchTriggered(true)} className="w-full h-11 rounded-xl gradient-blue shadow-lg font-black gap-2 text-white">
                  عرض السجلات <PlayCircle className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          )}
        </div>

        {loading ? (
          <div className="py-40 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-primary opacity-20" /></div>
        ) : !isSearchTriggered ? (
          <div className="py-32 text-center bg-white rounded-[3rem] shadow-xl border-4 border-dashed border-primary/20 max-w-2xl mx-auto">
             <PlayCircle className="w-16 h-16 text-primary/30 mx-auto mb-4" />
             <h3 className="text-2xl font-black text-primary">الأرشيف جاهز للاستعلام</h3>
             <p className="text-muted-foreground font-bold text-sm">حدد الفلاتر ثم اضغط "عرض السجلات" لجلب البيانات.</p>
          </div>
        ) : (
          view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {processedResults.map((item) => (
                <Card key={item.id} className="group overflow-hidden border-none shadow-lg rounded-2xl bg-white hover:-translate-y-1 transition-all flex flex-col h-full">
                  <div className="relative aspect-[3/4] bg-muted/30 overflow-hidden shrink-0 border-b">
                    {item.thumbnail || (item.file_type && item.file_type.includes('image')) ? (
                      <Image 
                        src={item.thumbnail || item.file_data} 
                        alt="Exam Thumbnail" 
                        fill 
                        className="object-cover object-top" 
                        unoptimized={true}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-primary/5 group-hover:bg-primary/10 transition-colors">
                         <div className="w-16 h-16 rounded-3xl gradient-blue flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                            <FileText className="w-8 h-8 text-white" />
                         </div>
                         <Badge variant="outline" className="border-primary/20 text-primary font-black text-[8px] tracking-widest uppercase">
                            {item.file_type === "application/pdf" ? "PDF DOCUMENT" : "IMAGE FILE"}
                         </Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                      <Button size="icon" onClick={() => setViewingExam(item)} className="rounded-lg h-9 w-9 bg-white text-primary shadow-lg hover:bg-white/90"><Eye className="w-5 h-5" /></Button>
                      <Button size="icon" onClick={() => setEditingExam(item)} className="rounded-lg h-9 w-9 bg-blue-500 text-white shadow-lg"><Edit2 className="w-5 h-5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="destructive" className="rounded-lg h-9 w-9 shadow-lg"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
                          <AlertDialogHeader className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                              <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="space-y-2 w-full text-right">
                              <AlertDialogTitle className="text-xl font-black text-primary">تأكيد الحذف</AlertDialogTitle>
                              <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                                هل أنت متأكد من حذف هذا الدفتر الخاص بالطالب <span className="text-red-600 font-black">({item.studentName})</span>؟
                              </AlertDialogDescription>
                            </div>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                            <AlertDialogAction onClick={() => handleDelete(item.id)} className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white border-none order-1">نعم، احذف</AlertDialogAction>
                            <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary order-2">تراجع</AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <Badge className="bg-primary/80 backdrop-blur-md text-[8px] px-2 py-0.5 rounded-lg font-bold">{item.term || item.year}</Badge>
                      {item.file_type === "application/pdf" && (
                        <Badge className="bg-red-500/80 backdrop-blur-md text-[8px] px-2 py-0.5 rounded-lg font-black uppercase">PDF</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4 text-right flex-1 flex flex-col">
                    <h3 className="text-sm font-black text-primary leading-tight line-clamp-2 mb-1">{item.studentName}</h3>
                    <p className="text-[10px] text-secondary font-bold flex items-center justify-start gap-1 mb-4">
                      <BookOpen className="w-3 h-3" /> {item.subjectName}
                    </p>
                    <div className="mt-auto border-t pt-3 flex items-center justify-between text-[8px] font-bold text-muted-foreground/70">
                       <span>{item.studentRegId}</span>
                       <span>{item.uploadedAt?.toDate ? item.uploadedAt.toDate().toLocaleDateString('ar-EG') : 'الآن'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden animate-slide-up">
              <div className="overflow-x-auto">
                <Table className="text-right">
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-right font-black text-primary py-5">الطالب / المادة</TableHead>
                      <TableHead className="text-right font-black text-primary">رقم القيد</TableHead>
                      <TableHead className="text-right font-black text-primary">المستوى / الترم</TableHead>
                      <TableHead className="text-right font-black text-primary">السنة</TableHead>
                      <TableHead className="text-center font-black text-primary w-40">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedResults.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/10 border-b group transition-colors">
                        <TableCell className="p-4">
                          <div className="flex flex-col">
                            <span className="font-black text-primary text-sm">{item.studentName}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{item.subjectName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-primary">{item.studentRegId}</TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-primary">{item.level}</span>
                             <span className="text-[10px] text-muted-foreground">{item.term}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-xs font-black text-secondary">{item.year}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                             <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-primary hover:bg-primary/5" onClick={() => setViewingExam(item)} title="معاينة"><Eye className="w-4 h-4" /></Button>
                             <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-blue-600 hover:bg-blue-50" onClick={() => setEditingExam(item)} title="تعديل"><Edit2 className="w-4 h-4" /></Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-destructive hover:bg-destructive/5" title="حذف"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
                                  <AlertDialogHeader className="flex flex-col items-center space-y-4">
                                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                                      <AlertTriangle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <div className="space-y-2 w-full text-right">
                                      <AlertDialogTitle className="text-xl font-black text-primary">تأكيد الحذف</AlertDialogTitle>
                                      <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                                        هل أنت متأكد من حذف هذا الدفتر الخاص بالطالب <span className="text-red-600 font-black">({item.studentName})</span>؟
                                      </AlertDialogDescription>
                                    </div>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                                    <AlertDialogAction onClick={() => handleDelete(item.id)} className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white border-none order-1">نعم، احذف</AlertDialogAction>
                                    <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary order-2">تراجع</AlertDialogCancel>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )
        )}
      </main>

      {/* Viewing Dialog */}
      <Dialog open={!!viewingExam} onOpenChange={(o) => !o && setViewingExam(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-7xl h-[90vh] overflow-hidden p-0 border-none shadow-2xl rounded-3xl bg-background flex flex-col" dir="rtl">
          <DialogHeader className="p-6 border-b bg-white shrink-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary"><BookOpen className="w-6 h-6" /></div>
                   <div>
                      <DialogTitle className="text-xl font-black text-primary leading-none mb-1">{viewingExam?.studentName}</DialogTitle>
                      <DialogDescription className="font-bold text-xs text-muted-foreground">معاينة المادة: {viewingExam?.subjectName}</DialogDescription>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <Button onClick={() => handleDownload(viewingExam)} variant="outline" className="rounded-xl font-black h-10 border-2 gap-2">
                      <Download className="w-4 h-4" /> تحميل نسخة
                   </Button>
                </div>
             </div>
          </DialogHeader>
          {viewingExam && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-100">
               <div className="w-full md:w-80 p-6 bg-white border-l overflow-y-auto">
                  <div className="space-y-6">
                     <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                          <Fingerprint className="w-3 h-3" /> بيانات الطالب المركزية
                        </Label>
                        <div className="bg-muted/30 p-4 rounded-2xl space-y-4 font-bold text-sm">
                           <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                             <span className="text-[10px] text-muted-foreground">اسم الطالب:</span>
                             <span className="text-primary font-black">{viewingExam.studentName}</span>
                           </div>
                           <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                             <span className="text-[10px] text-muted-foreground">رقم القيد:</span>
                             <span className="text-primary font-black">{viewingExam.studentRegId}</span>
                           </div>
                           <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                             <span className="text-[10px] text-muted-foreground">التخصص:</span>
                             <span className="text-secondary font-black">{viewingExam.departmentName}</span>
                           </div>
                           <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                             <span className="text-[10px] text-muted-foreground">المادة:</span>
                             <span className="text-primary font-black">{viewingExam.subjectName}</span>
                           </div>
                           <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                             <span className="text-[10px] text-muted-foreground">المستوى:</span>
                             <span className="text-primary font-black">{viewingExam.level}</span>
                           </div>
                           <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                             <span className="text-[10px] text-muted-foreground">الفصل الدراسي:</span>
                             <span className="text-secondary font-black">{viewingExam.term}</span>
                           </div>
                           <div className="flex flex-col gap-1">
                             <span className="text-[10px] text-muted-foreground">العام الجامعي:</span>
                             <span className="text-primary font-black">{viewingExam.year}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="flex-1 relative bg-neutral-200/50 flex items-center justify-center p-4">
                  <div className="w-full h-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-white/50 relative">
                     {viewingExam.file_type === "application/pdf" ? (
                       <iframe src={`${viewingExam.file_data}#toolbar=0&navpanes=0`} className="w-full h-full" title="PDF Reader" />
                     ) : (
                       <div className="relative w-full h-full">
                          <Image src={viewingExam.file_data || viewingExam.thumbnail} alt="Full Document" fill className="object-contain" priority unoptimized />
                       </div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingExam} onOpenChange={(o) => !o && setEditingExam(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-8">
            <DialogHeader className="text-right items-start mb-8">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-secondary" />
                تعديل بيانات السجل المؤرشف
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">تحديث كامل المعلومات المرتبطة بهذا الدفتر في الأرشيف.</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-2 col-span-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><UserPlus className="w-4 h-4 text-secondary" />اسم الطالب الكامل</Label>
                <Input value={editingExam?.studentName || ""} onChange={(e) => setEditingExam({...editingExam, studentName: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><Fingerprint className="w-4 h-4 text-secondary" />رقم القيد</Label>
                <Input value={editingExam?.studentRegId || ""} onChange={(e) => setEditingExam({...editingExam, studentRegId: e.target.value})} className="rounded-xl h-11 border-muted font-bold text-center" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><Building2 className="w-4 h-4 text-secondary" />التخصص العلمي</Label>
                <Input value={editingExam?.departmentName || ""} onChange={(e) => setEditingExam({...editingExam, departmentName: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4 text-secondary" />اسم المادة</Label>
                <Input value={editingExam?.subjectName || ""} onChange={(e) => setEditingExam({...editingExam, subjectName: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-secondary" />المستوى الدراسي</Label>
                <Input value={editingExam?.level || ""} onChange={(e) => setEditingExam({...editingExam, level: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><RefreshCw className="w-4 h-4 text-secondary" />الفصل الدراسي</Label>
                <Input value={editingExam?.term || ""} onChange={(e) => setEditingExam({...editingExam, term: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><Calendar className="w-4 h-4 text-secondary" />العام الجامعي</Label>
                <Input value={editingExam?.year || ""} onChange={(e) => setEditingExam({...editingExam, year: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>
            </div>

            <DialogFooter className="flex-row gap-3 pt-8 border-t mt-6">
              <Button disabled={isSubmitting} onClick={handleUpdate} className="flex-1 rounded-xl gradient-blue h-12 font-bold text-white gap-2 shadow-lg">
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                حفظ كافة التعديلات
              </Button>
              <Button variant="outline" onClick={() => setEditingExam(null)} className="flex-1 rounded-xl h-12 font-bold border-2">إلغاء</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
