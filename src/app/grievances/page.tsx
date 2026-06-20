
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  User, 
  Fingerprint, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  Eye,
  Clock,
  X,
  LayoutGrid,
  List,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  Save,
  Building2,
  ChevronLeft
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSidebarToggle } from "@/components/providers/SidebarProvider";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { compressImage } from "@/lib/storage-utils";
import { Separator } from "@/components/ui/separator";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";

export default function StaffGrievancesPage() {
  const { isOpen } = useSidebarToggle();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General States
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [viewingGrievance, setViewingGrievance] = useState<any>(null);
  const [editingGrievance, setEditingGrievance] = useState<any>(null);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    studentRegId: "",
    studentName: "",
    collegeName: "",
    departmentName: "",
    departmentId: "",
    admissionType: "",
    level: "",
    subjectName: "",
    subjectId: "",
    status: "لم يتم التعديل",
    notes: "",
    fileData: ""
  });

  // Queries
  const grievancesQuery = useMemo(() => 
    firestore ? query(collection(firestore, "grievances"), orderBy("createdAt", "desc")) : null
  , [firestore]);
  const deptsQuery = useMemo(() => firestore ? collection(firestore, "departments") : null, [firestore]);
  const subjectsQuery = useMemo(() => firestore ? collection(firestore, "subjects") : null, [firestore]);

  const { data: grievances = [], loading: loadingList } = useCollection(grievancesQuery);
  const { data: departments = [] } = useCollection(deptsQuery);
  const { data: allSubjects = [] } = useCollection(subjectsQuery);

  // Filtered Results
  const filteredGrievances = useMemo(() => {
    return (grievances as any[]).filter(item => {
      const matchesSearch = 
        item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.studentRegId?.includes(searchTerm) || 
        item.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;
      const matchesDept = filterDept === "all" || item.departmentId === filterDept;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [grievances, searchTerm, filterStatus, filterDept]);

  // Filtered Subjects for the dropdown (based on student dept/level)
  const availableSubjects = useMemo(() => {
    if (!formData.departmentId) return [];
    return (allSubjects as any[]).filter(s => s.departmentId === formData.departmentId);
  }, [allSubjects, formData.departmentId]);

  // Student Lookup
  const lookupStudent = async (regId: string) => {
    const cleanId = regId.trim();
    if (!firestore || !cleanId) return;
    setSearching(true);
    try {
      const q = query(collection(firestore, "students"), where("regId", "==", cleanId));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const student = snap.docs[0].data();
        setFormData(prev => ({
          ...prev,
          studentName: student.name || "",
          collegeName: student.collegeName || "",
          departmentName: student.departmentName || "",
          departmentId: student.departmentId || "",
          admissionType: student.admissionType || "",
          level: student.level || ""
        }));
        toast({ title: "تم العثور على بيانات الطالب بنجاح" });
      } else {
        toast({ variant: "destructive", title: "الطالب غير مسجل", description: "تأكد من رقم القيد أو قم بإضافة الطالب أولاً." });
        setFormData(prev => ({ ...prev, studentName: "", collegeName: "", departmentName: "", departmentId: "", admissionType: "", level: "" }));
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في البحث" });
    } finally {
      setSearching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const { data } = await compressImage(event.target.result as string, 0.7, 1200);
        setFormData(prev => ({ ...prev, fileData: data }));
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!firestore || !formData.studentRegId || !formData.subjectName || !formData.fileData) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى ملء جميع الحقول المطلوبة." });
      return;
    }

    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('userSession') || '{}');
      await addDoc(collection(firestore, "grievances"), {
        ...formData,
        staffName: session.name || "موظف",
        createdAt: serverTimestamp()
      });

      // Log action
      await addDoc(collection(firestore, "logs"), {
        user: session.name,
        role: "employee",
        action: "تسجيل طلب تظلم جديد",
        target: `${formData.studentName} - ${formData.subjectName}`,
        type: 'upload',
        timestamp: serverTimestamp()
      });

      toast({ title: "تم تسجيل التظلم بنجاح" });
      setIsAddOpen(false);
      resetForm();
    } catch (e) {
      toast({ variant: "destructive", title: "فشل حفظ البيانات" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!firestore || !editingGrievance) return;
    setLoading(true);
    try {
      const docRef = doc(firestore, "grievances", editingGrievance.id);
      await updateDoc(docRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });

      toast({ title: "تم تحديث بيانات التظلم" });
      setEditingGrievance(null);
      resetForm();
    } catch (error) {
      toast({ variant: "destructive", title: "فشل التحديث" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "grievances", id));
      toast({ variant: "destructive", title: "تم حذف السجل بنجاح" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في الحذف" });
    }
  };

  const resetForm = () => {
    setFormData({
      studentRegId: "", studentName: "", collegeName: "",
      departmentName: "", departmentId: "", admissionType: "",
      level: "", subjectName: "", subjectId: "",
      status: "لم يتم التعديل", notes: "", fileData: ""
    });
  };

  const startEdit = (item: any) => {
    setEditingGrievance(item);
    setFormData({
      studentRegId: item.studentRegId,
      studentName: item.studentName,
      collegeName: item.collegeName,
      departmentName: item.departmentName,
      departmentId: item.departmentId,
      admissionType: item.admissionType,
      level: item.level || "",
      subjectName: item.subjectName,
      subjectId: item.subjectId || "",
      status: item.status,
      notes: item.notes,
      fileData: item.fileData
    });
  };

  return (
    <div className="min-h-screen bg-background text-right" dir="rtl">
      <Sidebar />
      <Navbar />
      
      <main className={cn(
        "transition-all duration-300 p-4 md:p-10 animate-fade-in",
        isOpen ? "mr-0 md:mr-64" : "mr-0"
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-primary mb-1">مركز التظلمات الأكاديمية</h1>
            <p className="text-muted-foreground font-bold text-sm">مراجعة وتوثيق طلبات التظلم للمواد الدراسية</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white p-1 rounded-xl shadow-sm border flex gap-1">
                <Button variant={view === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setView('grid')} className={cn("h-9 w-9 rounded-lg", view === 'grid' && "bg-primary text-white shadow-md")}><LayoutGrid className="w-4 h-4" /></Button>
                <Button variant={view === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setView('list')} className={cn("h-9 w-9 rounded-lg", view === 'list' && "bg-primary text-white shadow-md")}><List className="w-4 h-4" /></Button>
             </div>
             <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="rounded-2xl h-12 px-6 font-bold gradient-blue shadow-lg gap-2 text-white">
               <Plus className="w-5 h-5" />
               طلب تظلم جديد
             </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="space-y-4 mb-8">
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
            <Card className="p-6 md:p-8 rounded-[2rem] shadow-lg border-none bg-white animate-slide-up grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-primary mr-1 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-secondary" />حالة التظلم</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="all">كافة الحالات</SelectItem>
                    <SelectItem value="تم التعديل">تم التعديل</SelectItem>
                    <SelectItem value="لم يتم التعديل">لم يتم التعديل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-primary mr-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-secondary" />القسم العلمي</label>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="القسم" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="all">كافة الأقسام</SelectItem>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr || d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}
        </div>

        {/* Results Area */}
        {loadingList ? (
          <div className="py-40 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-primary opacity-20" /></div>
        ) : filteredGrievances.length > 0 ? (
          view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
              {filteredGrievances.map((item: any) => (
                <Card key={item.id} className="group overflow-hidden border-none shadow-lg rounded-2xl bg-white hover:-translate-y-1 transition-all flex flex-col">
                  <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden shrink-0">
                    <Image src={item.fileData} alt="Survey" fill className="object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                      <Button size="icon" onClick={() => setViewingGrievance(item)} className="rounded-lg h-9 w-9 bg-white text-primary shadow-lg hover:bg-white/90" title="معاينة"><Eye className="w-5 h-5" /></Button>
                      <Button size="icon" onClick={() => startEdit(item)} className="rounded-lg h-9 w-9 bg-blue-500 text-white shadow-lg hover:bg-blue-600" title="تعديل"><Edit2 className="w-4 h-4" /></Button>
                      
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
                                 <AlertDialogTitle className="text-xl font-black text-primary">حذف طلب التظلم</AlertDialogTitle>
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
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden animate-slide-up">
               <div className="overflow-x-auto">
                  <table className="w-full text-right min-w-[800px]">
                    <thead>
                      <tr className="bg-muted/30 border-b">
                        <th className="p-5 font-black text-primary py-6">الطالب / المادة</th>
                        <th className="p-5 font-black text-primary">القسم</th>
                        <th className="p-5 font-black text-primary">الحالة</th>
                        <th className="p-5 font-black text-primary">تاريخ الطلب</th>
                        <th className="p-5 text-center font-black text-primary">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrievances.map((item: any) => (
                        <tr key={item.id} className="border-b hover:bg-muted/10 transition-colors group">
                           <td className="p-5">
                              <div className="flex flex-col">
                                 <span className="font-black text-primary text-sm">{item.studentName}</span>
                                 <span className="text-[10px] font-bold text-muted-foreground">{item.subjectName} • {item.studentRegId}</span>
                              </div>
                           </td>
                           <td className="p-5 text-xs font-bold text-muted-foreground">{item.departmentName}</td>
                           <td className="p-5">
                              <Badge className={cn(
                                "font-black text-[10px] px-3 py-1 rounded-lg border-none",
                                item.status === 'تم التعديل' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                              )}>{item.status}</Badge>
                           </td>
                           <td className="p-5 text-xs font-bold text-muted-foreground">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ar-EG') : '---'}</td>
                           <td className="p-5 text-center">
                              <div className="flex justify-center gap-2">
                                <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-primary hover:bg-primary/5" onClick={() => setViewingGrievance(item)} title="معاينة"><Eye className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-blue-600 hover:bg-blue-50" onClick={() => startEdit(item)} title="تعديل"><Edit2 className="w-4 h-4" /></Button>
                                
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
                                             هل أنت متأكد من حذف تظلم الطالب <span className="text-red-600 font-black">({item.studentName})</span>؟
                                          </AlertDialogDescription>
                                       </div>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                                       <AlertDialogAction onClick={() => handleDelete(item.id, item.studentName)} className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1">حذف نهائي</AlertDialogAction>
                                       <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all order-2">إلغاء</AlertDialogCancel>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </Card>
          )
        ) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed animate-fade-in max-w-2xl mx-auto">
            <ClipboardCheck className="w-20 h-20 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-2xl font-black text-primary mb-2">لا توجد تظلمات</h3>
            <p className="text-muted-foreground font-bold mb-8">لم يتم العثور على أي سجلات تظلم تطابق خيارات البحث الحالية.</p>
            <Button variant="outline" onClick={() => { setSearchTerm(""); setFilterStatus("all"); setFilterDept("all"); }} className="rounded-xl border-2 font-bold px-8 h-12">إعادة ضبط البحث</Button>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isAddOpen || !!editingGrievance} onOpenChange={(o) => { if(!o) { setIsAddOpen(false); setEditingGrievance(null); resetForm(); } }}>
          <DialogContent className="max-w-2xl rounded-[1.5rem] border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
            <div className="p-6 md:p-8 space-y-6">
              <DialogHeader className="text-right items-start space-y-1">
                <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                  {editingGrievance ? <Edit2 className="w-7 h-7 text-secondary" /> : <ClipboardCheck className="w-7 h-7 text-secondary" />}
                  {editingGrievance ? "تعديل طلب التظلم" : "تسجيل طلب تظلم ذكي"}
                </DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground text-[11px]">
                  {editingGrievance ? "تحديث بيانات التظلم والتقرير الفني المرفق." : "سيتم جلب بيانات الطالب آلياً بمجرد إدخال رقم القيد."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="space-y-1.5">
                  <Label className="text-primary font-black text-[10px] pr-1">رقم القيد الجامعي</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.studentRegId} 
                      onChange={(e) => setFormData({...formData, studentRegId: e.target.value})} 
                      onKeyDown={(e) => e.key === 'Enter' && lookupStudent(formData.studentRegId)}
                      placeholder="0000" 
                      className="rounded-xl h-11 bg-muted/20 border-muted font-black text-center text-base" 
                    />
                    {!editingGrievance && (
                      <Button onClick={() => lookupStudent(formData.studentRegId)} disabled={searching} className="h-11 w-11 rounded-xl gradient-blue shadow-md shrink-0 p-0">
                        {searching ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Search className="w-5 h-5 text-white" />}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-primary font-black text-[10px] pr-1">اسم الطالب (آلي)</Label>
                  <Input value={formData.studentName} readOnly className="rounded-xl h-11 bg-muted/10 border-transparent font-bold text-sm text-primary/70 cursor-default" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-primary font-black text-[10px] pr-1">المادة الدراسية</Label>
                  <Select 
                    value={formData.subjectId} 
                    onValueChange={(v) => {
                      const sel = availableSubjects.find((s: any) => s.id === v) as any;
                      setFormData({...formData, subjectId: v, subjectName: sel?.nameAr || ""});
                    }}
                  >
                    <SelectTrigger className="rounded-xl h-11 bg-muted/20 border-muted font-bold text-right text-xs">
                      <SelectValue placeholder={formData.departmentId ? "اختر المادة..." : "أدخل رقم القيد أولاً"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl font-bold">
                      {availableSubjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-primary font-black text-[10px] pr-1">الحالة النهائية للمراجعة</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="rounded-xl h-11 bg-muted/20 border-muted font-bold text-right text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl font-bold">
                      <SelectItem value="لم يتم التعديل">لم يتم التعديل (الدرجة مطابقة)</SelectItem>
                      <SelectItem value="تم التعديل">تم التعديل (الدرجة غير مطابقة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-full space-y-1.5">
                  <Label className="text-primary font-black text-[10px] pr-1">تقرير المراجعة والملاحظات</Label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                    placeholder="اكتب التقرير الفني لفتح الدفتر هنا..." 
                    className="rounded-xl min-h-[80px] bg-muted/20 border-muted font-bold text-xs p-4 leading-relaxed" 
                  />
                </div>

                <div className="col-span-full">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full h-14 rounded-xl border-2 border-dashed gap-3 text-sm font-black transition-all",
                      formData.fileData ? "border-green-500 bg-green-50 text-green-700" : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                    )}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : formData.fileData ? <CheckCircle2 className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                    {formData.fileData ? "تم رفع صورة الاستبيان" : "اضغط لرفع صورة الاستبيان الأصلي"}
                  </Button>
                </div>
              </div>

              <DialogFooter className="flex-row gap-4 pt-6 border-t mt-6">
                <Button 
                  disabled={loading} 
                  onClick={editingGrievance ? handleUpdate : handleSubmit} 
                  className="flex-1 rounded-xl h-12 text-base font-black gradient-blue shadow-lg gap-2 text-white"
                >
                  <Save className="w-5 h-5" />
                  {editingGrievance ? "حفظ التعديلات" : "تأكيد وتسجيل الطلب"}
                </Button>
                <Button variant="outline" onClick={() => { setIsAddOpen(false); setEditingGrievance(null); }} className="flex-1 rounded-xl h-12 text-base font-bold border-2">إلغاء</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Full Details View Dialog */}
        <Dialog open={!!viewingGrievance} onOpenChange={(o) => !o && setViewingGrievance(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[2rem] bg-background" dir="rtl">
            <DialogHeader className="sr-only">
              <DialogTitle>معاينة تفاصيل التظلم</DialogTitle>
              <DialogDescription>عرض بيانات الطالب وصورة الاستبيان المرفقة والتقرير الفني</DialogDescription>
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
                       <div className="flex items-center gap-2"><User className="w-4 h-4 text-secondary" /><span>الموظف المسؤول: {viewingGrievance.staffName}</span></div>
                       <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-secondary" /><span>تاريخ الإضافة: {viewingGrievance.createdAt?.toDate ? viewingGrievance.createdAt.toDate().toLocaleString('ar-EG') : 'الآن'}</span></div>
                    </div>
                  </div>
                  <div className="pt-10">
                     <Button onClick={() => { setViewingGrievance(null); startEdit(viewingGrievance); }} className="w-full h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 shadow-lg text-white gap-2">
                        <Edit2 className="w-4 h-4" /> تعديل بيانات الحالة
                     </Button>
                  </div>
                </div>
                <div className="flex-1 bg-neutral-100 p-8 min-h-[400px] flex items-center justify-center relative">
                   <div className="relative w-full h-full bg-white shadow-2xl rounded-2xl overflow-hidden border-8 border-white">
                      <Image src={viewingGrievance.fileData} alt="Full Survey" fill className="object-contain" />
                   </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

