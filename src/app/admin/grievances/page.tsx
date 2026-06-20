
"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Search, 
  Eye, 
  Trash2, 
  Loader2, 
  Filter, 
  X, 
  Download,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  BookOpen,
  Fingerprint,
  User,
  FileText
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, deleteDoc, doc, serverTimestamp, addDoc } from "firebase/firestore";

export default function AdminGrievancesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewingGrievance, setViewingGrievance] = useState<any>(null);

  // Queries
  const grievancesQuery = useMemo(() => 
    firestore ? query(collection(firestore, "grievances"), orderBy("createdAt", "desc")) : null
  , [firestore]);
  const deptsQuery = useMemo(() => firestore ? collection(firestore, "departments") : null, [firestore]);

  const { data: grievances = [], loading } = useCollection(grievancesQuery);
  const { data: departments = [] } = useCollection(deptsQuery);

  const filteredGrievances = useMemo(() => {
    return (grievances as any[]).filter(item => {
      const matchesSearch = 
        item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.studentRegId?.includes(searchTerm) || 
        item.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;
      const matchesDept = filterDept === "all" || item.departmentName === filterDept || item.departmentId === filterDept;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [grievances, searchTerm, filterStatus, filterDept]);

  // Statistics
  const stats = useMemo(() => {
    const total = grievances.length;
    const modified = grievances.filter((g: any) => g.status === 'تم التعديل').length;
    const unchanged = total - modified;
    return { total, modified, unchanged };
  }, [grievances]);

  const handleDelete = async (id: string, name: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "grievances", id));
      toast({ variant: "destructive", title: "تم حذف سجل التظلم" });
      
      await addDoc(collection(firestore, "logs"), {
        user: "المدير العام",
        role: "manager",
        action: "حذف سجل تظلم",
        target: name,
        type: 'delete',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في الحذف" });
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary mb-1">مركز إدارة التظلمات</h1>
          <p className="text-muted-foreground font-bold text-sm">مراجعة وتحليل طلبات مراجعة الدرجات والنتائج النهائية</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border self-end md:self-auto">
          <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')} className={cn("rounded-xl px-4 gap-2 h-9", view === 'grid' && "gradient-blue shadow-md text-white")}><LayoutGrid className="w-4 h-4" />شبكة</Button>
          <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')} className={cn("rounded-xl px-4 gap-2 h-9", view === 'list' && "gradient-blue shadow-md text-white")}><List className="w-4 h-4" />قائمة</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-none shadow-xl rounded-2xl bg-white flex items-center gap-5 border-r-8 border-primary">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><ClipboardCheck className="w-7 h-7" /></div>
          <div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">إجمالي الطلبات</p>
            <h4 className="text-3xl font-black text-primary">{stats.total}</h4>
          </div>
        </Card>
        <Card className="p-6 border-none shadow-xl rounded-2xl bg-white flex items-center gap-5 border-r-8 border-green-500">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-inner"><CheckCircle2 className="w-7 h-7" /></div>
          <div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">درجات معدلة</p>
            <h4 className="text-3xl font-black text-green-600">{stats.modified}</h4>
          </div>
        </Card>
        <Card className="p-6 border-none shadow-xl rounded-2xl bg-white flex items-center gap-5 border-r-8 border-orange-500">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-inner"><XCircle className="w-7 h-7" /></div>
          <div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">بدون تعديل</p>
            <h4 className="text-3xl font-black text-orange-600">{stats.unchanged}</h4>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-3 md:p-4 rounded-[2rem] shadow-xl border-none bg-white flex flex-col md:flex-row items-center gap-4">
          <div className="flex-[3] relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="ابحث باسم الطالب، رقم القيد، أو المادة..." 
              className="w-full h-12 md:h-14 pr-12 pl-4 rounded-2xl border-none bg-muted/20 outline-none focus:ring-2 focus:ring-primary font-bold transition-all text-sm" 
            />
          </div>
          <Button 
            variant={showFilters ? "default" : "outline"} 
            onClick={() => setShowFilters(!showFilters)} 
            className="h-12 md:h-14 w-full md:w-auto rounded-2xl px-8 border-2 font-black gap-2 text-sm"
          >
            {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
            تصفية
          </Button>
        </Card>

        {showFilters && (
          <Card className="p-6 md:p-8 rounded-[2rem] shadow-lg border-none bg-white animate-slide-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-primary mr-1 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-secondary" />حالة التعديل</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                <SelectContent className="rounded-xl font-bold">
                  <SelectItem value="all">كافة الحالات</SelectItem>
                  <SelectItem value="تم التعديل">تم التعديل</SelectItem>
                  <SelectItem value="لم يتم التعديل">لم يتم التعديل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-primary mr-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-secondary" />التخصص العلمي</label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
                <SelectContent className="rounded-xl font-bold">
                  <SelectItem value="all">كافة التخصصات</SelectItem>
                  {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr || d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Card>
        )}
      </div>

      {loading ? (
        <div className="py-40 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-primary opacity-20" /></div>
      ) : (
        <div className="animate-slide-up">
          {filteredGrievances.length > 0 ? (
            view === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGrievances.map((item: any) => (
                  <Card key={item.id} className="group overflow-hidden border-none shadow-lg rounded-2xl bg-white hover:-translate-y-1 transition-all flex flex-col">
                    <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden shrink-0">
                      {item.fileData ? (
                        <Image src={item.fileData} alt="Survey" fill className="object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <FileText className="w-12 h-12 text-primary opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <Button size="icon" onClick={() => setViewingGrievance(item)} className="rounded-lg h-9 w-9 bg-white text-primary shadow-lg hover:bg-white/90" title="معاينة"><Eye className="w-5 h-5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="destructive" className="rounded-lg h-9 w-9 shadow-lg" title="حذف"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
                            <AlertDialogHeader className="flex flex-col items-center space-y-4">
                              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                              </div>
                              <div className="space-y-2 w-full text-right">
                                <AlertDialogTitle className="text-xl font-black text-primary">حذف سجل التظلم</AlertDialogTitle>
                                <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                                  سيتم مسح سجل تظلم الطالب <span className="text-red-600 font-black">({item.studentName})</span> نهائياً. لا يمكن التراجع.
                                </AlertDialogDescription>
                              </div>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                              <AlertDialogAction onClick={() => handleDelete(item.id, item.studentName)} className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1">نعم، احذف السجل</AlertDialogAction>
                              <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all order-2">إلغاء</AlertDialogCancel>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge className={cn(
                          "font-black text-[10px] px-2 py-0.5 rounded-lg border-none shadow-md",
                          item.status === 'تم التعديل' ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                        )}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-black text-primary text-sm mb-1 truncate">{item.studentName}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold mb-3">
                        <Fingerprint className="w-3 h-3 text-secondary" />
                        <span>{item.studentRegId}</span>
                        <span className="mx-1">•</span>
                        <BookOpen className="w-3 h-3 text-secondary" />
                        <span className="truncate">{item.subjectName}</span>
                      </div>
                      <div className="mt-auto pt-3 border-t flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ar-EG') : 'الآن'}</span>
                        <span className="text-secondary truncate max-w-[80px]">{item.departmentName}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="text-right">
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-right font-black text-primary py-5">الطالب / المادة</TableHead>
                        <TableHead className="text-right font-black text-primary">الحالة</TableHead>
                        <TableHead className="text-right font-black text-primary">الموظف</TableHead>
                        <TableHead className="text-right font-black text-primary">التاريخ</TableHead>
                        <TableHead className="text-center font-black text-primary w-32">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGrievances.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-muted/10 border-b group transition-colors">
                          <TableCell className="p-4">
                            <div className="flex flex-col">
                              <span className="font-black text-primary text-sm">{item.studentName}</span>
                              <span className="text-[10px] font-bold text-muted-foreground">{item.subjectName} • {item.studentRegId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "font-black text-[10px] px-3 py-1 rounded-lg border-none",
                              item.status === 'تم التعديل' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                            )}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-primary">{item.staffName}</TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ar-EG') : '---'}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-primary hover:bg-primary/5" onClick={() => setViewingGrievance(item)} title="معاينة"><Eye className="w-4 h-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-destructive hover:bg-destructive/5" title="حذف">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
                                  <AlertDialogHeader className="flex flex-col items-center space-y-4">
                                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                                      <AlertTriangle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <div className="space-y-2 w-full text-right">
                                      <AlertDialogTitle className="text-xl font-black text-primary">تأكيد حذف التظلم</AlertDialogTitle>
                                      <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                                        هل أنت متأكد من حذف سجل تظلم الطالب <span className="text-red-600 font-black">({item.studentName})</span>؟ لا يمكن التراجع عن هذا الإجراء.
                                      </AlertDialogDescription>
                                    </div>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                                    <AlertDialogAction onClick={() => handleDelete(item.id, item.studentName)} className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1">نعم، احذف السجل</AlertDialogAction>
                                    <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all order-2">تراجع</AlertDialogCancel>
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
          ) : (
            <div className="py-40 text-center bg-white rounded-[3rem] border-4 border-dashed max-w-2xl mx-auto">
              <ClipboardCheck className="w-20 h-20 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-2xl font-black text-primary">لا توجد سجلات تظلم</h3>
              <p className="text-muted-foreground font-bold mt-2">لم يتم تسجيل أي طلبات تظلم تطابق البحث.</p>
            </div>
          )}
        </div>
      )}

      {/* Viewing Dialog */}
      <Dialog open={!!viewingGrievance} onOpenChange={(o) => !o && setViewingGrievance(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[2rem] bg-background" dir="rtl">
          <DialogHeader className="sr-only">
            <DialogTitle>تفاصيل طلب التظلم</DialogTitle>
            <DialogDescription>معاينة بيانات الطالب والتقرير الفني</DialogDescription>
          </DialogHeader>
          {viewingGrievance && (
            <div className="flex flex-col lg:flex-row h-full w-full relative">
               <button 
                onClick={() => setViewingGrievance(null)}
                className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <X className="w-5 h-5 text-primary" />
              </button>
              <div className="w-full lg:w-2/5 p-8 bg-white flex flex-col text-right border-l">
                <div className="space-y-8 flex-1">
                  <div className="space-y-3">
                     <Label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest block">سجل التظلم الرسمي</Label>
                     <h3 className="text-3xl font-black text-primary leading-tight">{viewingGrievance.studentName}</h3>
                     <Badge className={cn("mt-2 border-none font-black text-sm px-4 py-1 rounded-lg", viewingGrievance.status === 'تم التعديل' ? "bg-green-500 text-white" : "bg-orange-500 text-white")}>
                       {viewingGrievance.status}
                     </Badge>
                  </div>

                  <Separator className="opacity-50" />

                  <div className="grid grid-cols-1 gap-4">
                     <div className="p-4 rounded-2xl bg-muted/10 border-r-4 border-primary">
                        <Label className="text-muted-foreground text-[9px] font-black block mb-1">المادة الدراسية</Label>
                        <div className="font-black text-primary text-base flex items-center gap-2">
                           {viewingGrievance.subjectName}
                           <BookOpen className="w-4 h-4 text-secondary" />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-muted/10 border-r-4 border-secondary">
                           <Label className="text-muted-foreground text-[9px] font-black block mb-1">رقم القيد</Label>
                           <div className="font-black text-primary text-sm">{viewingGrievance.studentRegId}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/10 border-r-4 border-secondary">
                           <Label className="text-muted-foreground text-[9px] font-black block mb-1">التخصص</Label>
                           <div className="font-black text-primary text-[10px] truncate">{viewingGrievance.departmentName}</div>
                        </div>
                     </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                     <Label className="text-primary text-xs font-black flex items-center gap-2 mb-4">
                       <FileText className="w-5 h-5 text-secondary" />
                       التقرير الفني للمراجعة
                     </Label>
                     <p className="text-sm font-bold text-muted-foreground leading-relaxed whitespace-pre-wrap">{viewingGrievance.notes || "لم يتم تدوين ملاحظات إضافية."}</p>
                  </div>

                  <div className="space-y-3 pt-4 text-[10px] font-bold text-muted-foreground/80">
                     <div className="flex items-center gap-2"><User className="w-4 h-4 text-secondary" /><span>اسم الموظف: {viewingGrievance.staffName}</span></div>
                     <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-secondary" /><span>تاريخ الإضافة: {viewingGrievance.createdAt?.toDate ? viewingGrievance.createdAt.toDate().toLocaleDateString('ar-EG') : 'الآن'}</span></div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-neutral-100 p-8 min-h-[400px] flex items-center justify-center relative">
                 <div className="relative w-full h-full bg-white shadow-2xl rounded-2xl overflow-hidden border-8 border-white">
                    {viewingGrievance.fileData ? (
                      <Image src={viewingGrievance.fileData} alt="Full Survey" fill className="object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <FileText className="w-20 h-20 opacity-20" />
                        <p className="font-bold">لا توجد صورة مرفقة</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
