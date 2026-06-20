
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2,
  Loader2,
  Fingerprint,
  User,
  Building2,
  Banknote,
  Filter,
  Layers,
  ShieldCheck,
  CheckCircle,
  School,
  Calendar,
  X,
  AlertTriangle,
  TrendingUp
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";

export default function AdminStudentsPage() {
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();

  // Queries
  const studentsQuery = useMemo(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const deptsQuery = useMemo(() => firestore ? collection(firestore, "departments") : null, [firestore]);
  const collegesQuery = useMemo(() => firestore ? collection(firestore, "colleges") : null, [firestore]);
  const yearsQuery = useMemo(() => firestore ? collection(firestore, "academicYears") : null, [firestore]);

  const { data: students = [], loading } = useCollection(studentsQuery);
  const { data: departments = [] } = useCollection(deptsQuery);
  const { data: colleges = [] } = useCollection(collegesQuery);
  const { data: academicYears = [] } = useCollection(yearsQuery);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterAdmissionType, setFilterAdmissionType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);

  const [newStudent, setNewStudent] = useState({
    name: "",
    regId: "",
    collegeId: "",
    departmentId: "",
    level: "المستوى الثاني",
    admissionType: "عام",
    academicYear: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredStudents = useMemo(() => {
    return (students as any[]).filter(student => {
      const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           student.regId?.includes(searchTerm);
      const matchesCollege = filterCollege === "all" || student.collegeId === filterCollege;
      const matchesDept = filterDept === "all" || student.departmentId === filterDept;
      const matchesLevel = filterLevel === "all" || student.level === filterLevel;
      const matchesYear = filterYear === "all" || student.academicYear === filterYear;
      const matchesAdmission = filterAdmissionType === "all" || student.admissionType === filterAdmissionType;
      
      return matchesSearch && matchesCollege && matchesDept && matchesLevel && matchesYear && matchesAdmission;
    });
  }, [students, searchTerm, filterCollege, filterDept, filterLevel, filterYear, filterAdmissionType]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const handleBatchPromote = async () => {
    if (!firestore || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const batch = writeBatch(firestore);
      const levels = ["المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع", "المستوى الخامس"];
      
      selectedIds.forEach(id => {
        const student = (students as any[]).find(s => s.id === id);
        if (student) {
          const currentIndex = levels.indexOf(student.level);
          let nextLevel = student.level;
          if (currentIndex !== -1 && currentIndex < levels.length - 1) {
            nextLevel = levels[currentIndex + 1];
          } else if (currentIndex === levels.length - 1) {
            nextLevel = "خريج";
          }
          
          const docRef = doc(firestore, "students", id);
          batch.update(docRef, { level: nextLevel, updatedAt: serverTimestamp() });
        }
      });

      await batch.commit();

      // تسجيل في السجل
      await addDoc(collection(firestore, "logs"), {
        user: "المدير العام",
        role: "manager",
        action: "ترفيع جماعي للطلاب",
        target: `تم ترفيع ${selectedIds.length} طالب إلى مستويات أعلى`,
        type: 'update',
        timestamp: serverTimestamp()
      });

      setSelectedIds([]);
      setIsPromoteDialogOpen(false);
      toast({ title: "تم ترفيع الطلاب بنجاح" });
    } catch (error) {
      toast({ variant: "destructive", title: "فشل الترفيع الجماعي" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStudent = async () => {
    if (!firestore || !newStudent.name || !newStudent.regId || !newStudent.collegeId || !newStudent.departmentId || !newStudent.academicYear) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى ملء جميع الحقول المطلوبة لتسجيل الطالب." });
      return;
    }

    // منع تكرار رقم القيد
    const isDuplicate = students.some((s: any) => s.regId === newStudent.regId);
    if (isDuplicate) {
      toast({ 
        variant: "destructive", 
        title: "رقم القيد مسجل مسبقاً", 
        description: "هذا الطالب مسجل بالفعل في النظام بهذا الرقم." 
      });
      return;
    }

    setSubmitting(true);
    try {
      const selectedCollege = (colleges as any[]).find(c => c.id === newStudent.collegeId);
      const selectedDept = (departments as any[]).find(d => d.id === newStudent.departmentId);

      await addDoc(collection(firestore, "students"), {
        ...newStudent,
        collegeName: selectedCollege?.name || "",
        departmentName: selectedDept?.nameAr || selectedDept?.name || "",
        status: "active",
        joinDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      setIsAddDialogOpen(false);
      setNewStudent({ name: "", regId: "", collegeId: "", departmentId: "", level: "المستوى الثاني", admissionType: "عام", academicYear: "" });
      toast({ title: "تم تسجيل الطالب بنجاح" });
    } catch (error) {
      toast({ variant: "destructive", title: "فشل الحفظ" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudent = async () => {
    if (!firestore || !editingStudent?.name || !editingStudent?.regId) return;

    setSubmitting(true);
    try {
      const selectedCollege = (colleges as any[]).find(c => c.id === editingStudent.collegeId);
      const selectedDept = (departments as any[]).find(d => d.id === editingStudent.departmentId);
      
      const docRef = doc(firestore, "students", editingStudent.id);
      const data = {
        name: editingStudent.name,
        regId: editingStudent.regId,
        collegeId: editingStudent.collegeId || "",
        collegeName: selectedCollege?.name || editingStudent.collegeName || "",
        departmentId: editingStudent.departmentId || "",
        departmentName: selectedDept?.nameAr || selectedDept?.name || editingStudent.departmentName || "",
        level: editingStudent.level || "المستوى الثاني",
        admissionType: editingStudent.admissionType || "عام",
        academicYear: editingStudent.academicYear || "",
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, data);
      setEditingStudent(null);
      toast({ title: "تم تحديث بيانات الطالب بنجاح" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في التحديث" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveToBin = async (student: any) => {
    if (!firestore) return;
    try {
      const { id, ...originalData } = student;
      await addDoc(collection(firestore, "recycleBin"), {
        type: 'student',
        originalData,
        originalId: id,
        deletedAt: serverTimestamp(),
        name: student.name,
        identifier: student.regId
      });
      await deleteDoc(doc(firestore, "students", id));
      toast({ title: "تم نقل الطالب لسلة المحذوفات" });
    } catch (error) {
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  const resetFilters = () => {
    setFilterCollege("all");
    setFilterDept("all");
    setFilterLevel("all");
    setFilterYear("all");
    setFilterAdmissionType("all");
    setSearchTerm("");
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary mb-1">إدارة شؤون الطلاب</h1>
          <p className="text-muted-foreground font-bold text-sm">تحديث وإدارة الملفات الأكاديمية لكافة الطلاب</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.length > 0 && (
            <Button 
              onClick={() => setIsPromoteDialogOpen(true)}
              className="rounded-2xl h-12 px-6 font-bold bg-orange-500 hover:bg-orange-600 shadow-lg gap-2 text-white animate-slide-up"
            >
              <TrendingUp className="w-5 h-5" />
              ترفيع ({selectedIds.length}) طلاب
            </Button>
          )}

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl h-12 px-6 font-bold gradient-blue shadow-lg gap-2 text-white">
                <UserPlus className="w-5 h-5" />
                تسجيل طالب جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-[2.5rem] border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
              <div className="p-10">
                <DialogHeader className="text-right items-start space-y-2 mb-10">
                  <DialogTitle className="text-2xl font-black text-primary flex items-center gap-3">
                    <ShieldCheck className="w-7 h-7 text-secondary" />
                    تسجيل ملف أكاديمي جديد
                  </DialogTitle>
                  <DialogDescription className="font-bold text-muted-foreground">أدخل البيانات الرسمية للطالب لربطه بالتخصص والعام الدراسي.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                  <div className="space-y-2 col-span-2 text-right">
                    <Label className="text-primary font-black flex items-center gap-2 mb-2 pr-1">
                      <User className="w-4 h-4 text-secondary" />
                      الاسم الرباعي الكامل
                    </Label>
                    <Input value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} placeholder="الاسم كما في الهوية" className="rounded-xl h-12 bg-muted/20 border-muted focus:ring-primary/20 font-bold" />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-primary font-black flex items-center gap-2 mb-2 pr-1">
                      <Fingerprint className="w-4 h-4 text-secondary" />
                      رقم القيد الجامعي
                    </Label>
                    <Input value={newStudent.regId} onChange={(e) => setNewStudent({...newStudent, regId: e.target.value})} placeholder="رقم القيد" className="rounded-xl h-12 bg-muted/20 border-muted font-black" />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-primary font-black flex items-center gap-2 mb-2 pr-1">
                      <Calendar className="w-4 h-4 text-secondary" />
                      العام الجامعي
                    </Label>
                    <Select onValueChange={(v) => setNewStudent({...newStudent, academicYear: v})}>
                      <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                        <SelectValue placeholder="اختر العام..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-bold" dir="rtl">
                        {academicYears.map((y: any) => <SelectItem key={y.id} value={y.label}>{y.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-primary font-black flex items-center gap-2 mb-2 pr-1">
                      <School className="w-4 h-4 text-secondary" />
                      الكلية
                    </Label>
                    <Select onValueChange={(v) => setNewStudent({...newStudent, collegeId: v, departmentId: ""})}>
                      <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                        <SelectValue placeholder="اختر الكلية" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-bold" dir="rtl">
                        {colleges.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-primary font-black flex items-center gap-2 mb-2 pr-1">
                      <Building2 className="w-4 h-4 text-secondary" />
                      التخصص / القسم
                    </Label>
                    <Select value={newStudent.departmentId} onValueChange={(v) => setNewStudent({...newStudent, departmentId: v})}>
                      <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                        <SelectValue placeholder="اختر التخصص" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-bold" dir="rtl">
                        {departments.filter((d: any) => !newStudent.collegeId || d.collegeId === newStudent.collegeId).map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.nameAr || d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-primary font-black flex items-center gap-2 mb-2 pr-1">
                      <Layers className="w-4 h-4 text-secondary" />
                      المستوى الدراسي
                    </Label>
                    <Select value={newStudent.level} onValueChange={(v) => setNewStudent({...newStudent, level: v})}>
                      <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                        <SelectValue placeholder="المستوى" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-bold" dir="rtl">
                        <SelectItem value="المستوى الأول">المستوى الأول</SelectItem>
                        <SelectItem value="المستوى الثاني">المستوى الثاني</SelectItem>
                        <SelectItem value="المستوى الثالث">المستوى الثالث</SelectItem>
                        <SelectItem value="المستوى الرابع">المستوى الرابع</SelectItem>
                        <SelectItem value="المستوى الخامس">المستوى الخامس</SelectItem>
                        <SelectItem value="خريج">خريج</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="text-primary font-black flex items-center gap-2 mb-2 pr-1">
                      <Banknote className="w-4 h-4 text-secondary" />
                      نوع القبول
                    </Label>
                    <Select value={newStudent.admissionType} onValueChange={(v) => setNewStudent({...newStudent, admissionType: v})}>
                      <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                        <SelectValue placeholder="نظام القبول" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-bold" dir="rtl">
                        <SelectItem value="عام">نظام عام</SelectItem>
                        <SelectItem value="موازي">تعليم موازي</SelectItem>
                        <SelectItem value="نفقة خاصة">نفقة خاصة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="flex-row gap-4 pt-10 border-t mt-8">
                  <Button disabled={submitting} onClick={handleAddStudent} className="flex-1 rounded-2xl h-14 text-lg font-black gradient-blue shadow-lg gap-2 text-white">
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                    تأكيد التسجيل
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1 rounded-2xl h-14 text-lg font-bold border-2">إلغاء</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-3 md:p-4 rounded-[2rem] shadow-xl border-none bg-white flex flex-col md:flex-row items-center gap-4">
          <div className="flex-[3] relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="ابحث باسم الطالب أو رقم القيد..." 
              className="w-full h-12 md:h-14 pr-12 pl-4 rounded-2xl border-none bg-muted/20 outline-none focus:ring-2 focus:ring-primary font-bold transition-all text-sm text-right" 
            />
          </div>
          <Button 
            variant={showFilters ? "default" : "outline"} 
            onClick={() => setShowFilters(!showFilters)} 
            className="h-12 md:h-14 w-full md:w-auto rounded-2xl px-8 border-2 font-black gap-2 text-sm"
          >
            {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
            تصفية النتائج
          </Button>
        </Card>

        {showFilters && (
          <Card className="p-6 md:p-8 rounded-[2rem] shadow-lg border-none bg-white animate-slide-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-primary mr-1 flex items-center gap-2 justify-start"><Calendar className="w-4 h-4 text-secondary" />السنة الدراسية</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="السنة" /></SelectTrigger>
                <SelectContent className="rounded-xl font-bold" dir="rtl">
                  <SelectItem value="all">كافة السنوات</SelectItem>
                  {academicYears.map((y: any) => <SelectItem key={y.id} value={y.label}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-primary mr-1 flex items-center gap-2 justify-start"><School className="w-4 h-4 text-secondary" />الكلية</label>
              <Select value={filterCollege} onValueChange={setFilterCollege}>
                <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="الكلية" /></SelectTrigger>
                <SelectContent className="rounded-xl font-bold" dir="rtl">
                  <SelectItem value="all">كافة الكليات</SelectItem>
                  {colleges.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-primary mr-1 flex items-center gap-2 justify-start"><Building2 className="w-4 h-4 text-secondary" />التخصص</label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="التخصص" /></SelectTrigger>
                <SelectContent className="rounded-xl font-bold" dir="rtl">
                  <SelectItem value="all">كافة التخصصات</SelectItem>
                  {departments.filter((d: any) => filterCollege === "all" || d.collegeId === filterCollege).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.nameAr || d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-primary mr-1 flex items-center gap-2 justify-start"><Layers className="w-4 h-4 text-secondary" />المستوى</label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="المستوى" /></SelectTrigger>
                <SelectContent className="rounded-xl font-bold" dir="rtl">
                  <SelectItem value="all">كافة المستويات</SelectItem>
                  <SelectItem value="المستوى الأول">الأول</SelectItem>
                  <SelectItem value="المستوى الثاني">الثاني</SelectItem>
                  <SelectItem value="المستوى الثالث">الثالث</SelectItem>
                  <SelectItem value="المستوى الرابع">الرابع</SelectItem>
                  <SelectItem value="المستوى الخامس">الخامس</SelectItem>
                  <SelectItem value="خريج">خريج</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-primary mr-1 flex items-center gap-2 justify-start"><Banknote className="w-4 h-4 text-secondary" />نوع القبول</label>
              <Select value={filterAdmissionType} onValueChange={setFilterAdmissionType}>
                <SelectTrigger className="rounded-xl h-11 bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="النوع" /></SelectTrigger>
                <SelectContent className="rounded-xl font-bold" dir="rtl">
                  <SelectItem value="all">كافة الأنواع</SelectItem>
                  <SelectItem value="عام">عام</SelectItem>
                  <SelectItem value="موازي">موازي</SelectItem>
                  <SelectItem value="نفقة خاصة">نفقة خاصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" onClick={resetFilters} className="xl:col-span-5 text-muted-foreground font-bold hover:text-primary gap-2 h-10 mt-2">
              <X className="w-4 h-4" />
              إعادة ضبط كافة الفلاتر
            </Button>
          </Card>
        )}
      </div>

      <Card className="p-6 border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
        <div className="rounded-2xl border overflow-hidden">
          <Table className="text-right">
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-right font-black text-primary py-5">الطالب / القيد</TableHead>
                <TableHead className="text-right font-black text-primary">الكلية / التخصص</TableHead>
                <TableHead className="text-right font-black text-primary">السنة / المستوى</TableHead>
                <TableHead className="text-right font-black text-primary">نظام القبول</TableHead>
                <TableHead className="text-center font-black text-primary w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-60 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto opacity-20 text-primary" /></TableCell></TableRow>
              ) : filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/10 border-b group transition-colors">
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={selectedIds.includes(student.id)}
                      onCheckedChange={() => toggleSelect(student.id)}
                    />
                  </TableCell>
                  <TableCell className="p-4 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
                        <GraduationCap className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-primary text-base">{student.name}</span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground tracking-widest">{student.regId}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-secondary uppercase mb-0.5">{student.collegeName || '---'}</span>
                      <span className="text-sm font-bold text-primary">{student.departmentName || '---'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-primary">{student.academicYear || '---'}</span>
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" />{student.level || 'المستوى الثاني'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] px-3 py-1 border-secondary/30 text-secondary font-black bg-secondary/5 rounded-lg">
                      {student.admissionType || 'عام'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setEditingStudent(student)}
                        className="rounded-xl hover:bg-blue-50 text-blue-600 h-9 w-9"
                        title="تحديث البيانات"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl hover:bg-destructive/10 text-destructive h-9 w-9"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[380px] rounded-[2rem] border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
                          <div className="p-8 space-y-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[3000ms]">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                              </div>
                              <div className="space-y-2 text-right w-full">
                                <AlertDialogTitle className="text-xl font-black text-primary">تأكيد عملية الحذف</AlertDialogTitle>
                                <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                                  أنت على وشك حذف سجل الطالب <span className="text-red-600 font-black">({student.name})</span> ونقله للسلة. لا يمكن التراجع عن هذا الإجراء لاحقاً.
                                </AlertDialogDescription>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <AlertDialogAction 
                                onClick={() => handleMoveToBin(student)} 
                                className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none"
                              >
                                نعم، احذف السجل الآن
                              </AlertDialogAction>
                              <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all">إلغاء</AlertDialogCancel>
                            </div>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="h-60 text-center text-muted-foreground font-bold">لا يوجد طلاب مطابقين للبحث حالياً</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Promote Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent className="max-w-[380px] rounded-[2rem] border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center animate-bounce duration-[3000ms]">
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
              <div className="space-y-2 text-right w-full">
                <DialogTitle className="text-xl font-black text-primary">تأكيد الترفيع الجماعي</DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                  سيتم ترفيع <span className="text-orange-600 font-black">({selectedIds.length})</span> طلاب إلى المستوى الدراسي التالي. هل أنت متأكد من تنفيذ هذه العملية؟
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                disabled={submitting} 
                onClick={handleBatchPromote} 
                className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 font-black h-12 text-white shadow-lg border-none"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "نعم، قم بالترفيع الآن"}
              </Button>
              <Button variant="outline" onClick={() => setIsPromoteDialogOpen(false)} className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-10">
            <DialogHeader className="text-right items-start space-y-2 mb-10">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-3">
                <Edit2 className="w-7 h-7 text-secondary" />
                تحديث السجل الأكاديمي
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">تعديل المعلومات الأكاديمية وإكمال الحقول الناقصة لهذا الطالب.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="space-y-2 col-span-2 text-right">
                <Label className="text-primary font-black flex items-center gap-2 pr-1 mb-2">
                  <User className="w-4 h-4 text-secondary" />
                  الاسم الكامل
                </Label>
                <Input 
                  value={editingStudent?.name || ""}
                  onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                  className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" 
                />
              </div>
              <div className="space-y-2 text-right">
                <Label className="text-primary font-black flex items-center gap-2 pr-1 mb-2">
                  <Fingerprint className="w-4 h-4 text-secondary" />
                  رقم القيد
                </Label>
                <Input 
                  value={editingStudent?.regId || ""}
                  onChange={(e) => setEditingStudent({...editingStudent, regId: e.target.value})}
                  className="rounded-xl h-12 bg-muted/20 border-muted text-right font-black" 
                />
              </div>
              <div className="space-y-2 text-right">
                <Label className="text-primary font-black flex items-center gap-2 pr-1 mb-2">
                  <Calendar className="w-4 h-4 text-secondary" />
                  السنة الجامعية
                </Label>
                <Select value={editingStudent?.academicYear || ""} onValueChange={(v) => setEditingStudent({...editingStudent, academicYear: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                    <SelectValue placeholder="اختر السنة..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold" dir="rtl">
                    {academicYears.map((y: any) => <SelectItem key={y.id} value={y.label}>{y.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <Label className="text-primary font-black flex items-center gap-2 pr-1 mb-2">
                  <School className="w-4 h-4 text-secondary" />
                  الكلية
                </Label>
                <Select value={editingStudent?.collegeId || ""} onValueChange={(v) => setEditingStudent({...editingStudent, collegeId: v, departmentId: ""})}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                    <SelectValue placeholder="اختر الكلية..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold" dir="rtl">
                    {colleges.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <Label className="text-primary font-black flex items-center gap-2 pr-1 mb-2">
                  <Building2 className="w-4 h-4 text-secondary" />
                  التخصص الدراسي
                </Label>
                <Select value={editingStudent?.departmentId || ""} onValueChange={(v) => setEditingStudent({...editingStudent, departmentId: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                    <SelectValue placeholder="اختر التخصص..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold" dir="rtl">
                    {departments.filter((d: any) => !editingStudent?.collegeId || d.collegeId === editingStudent.collegeId).map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.nameAr || d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <Label className="text-primary font-black flex items-center gap-2 pr-1 mb-2">
                  <Layers className="w-4 h-4 text-secondary" />
                  المستوى الدراسي
                </Label>
                <Select value={editingStudent?.level || ""} onValueChange={(v) => setEditingStudent({...editingStudent, level: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                    <SelectValue placeholder="اختر المستوى..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold" dir="rtl">
                    <SelectItem value="المستوى الأول">المستوى الأول</SelectItem>
                    <SelectItem value="المستوى الثاني">المستوى الثاني</SelectItem>
                    <SelectItem value="المستوى الثالث">المستوى الثالث</SelectItem>
                    <SelectItem value="المستوى الرابع">المستوى الرابع</SelectItem>
                    <SelectItem value="المستوى الخامس">المستوى الخامس</SelectItem>
                    <SelectItem value="خريج">خريج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <Label className="text-primary font-black flex items-center gap-2 pr-1 mb-2">
                  <Banknote className="w-4 h-4 text-secondary" />
                  نوع القبول
                </Label>
                <Select value={editingStudent?.admissionType || "عام"} onValueChange={(v) => setEditingStudent({...editingStudent, admissionType: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted text-right font-bold" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold" dir="rtl">
                    <SelectItem value="عام">نظام عام</SelectItem>
                    <SelectItem value="موازي">تعليم موازي</SelectItem>
                    <SelectItem value="نفقة خاصة">نفقة خاصة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-row gap-4 pt-10 border-t mt-8">
              <Button 
                disabled={submitting} 
                onClick={handleUpdateStudent}
                className="flex-1 rounded-2xl h-14 text-lg font-black gradient-blue shadow-lg gap-2 text-white"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                حفظ التحديثات
              </Button>
              <Button variant="outline" onClick={() => setEditingStudent(null)} className="flex-1 rounded-2xl h-14 text-lg font-bold border-2">تراجع</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
