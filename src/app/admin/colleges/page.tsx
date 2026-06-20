
"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  School, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Building2,
  Calendar,
  ShieldCheck,
  Loader2,
  FileText,
  Hash,
  Type,
  CheckCircle,
  XCircle,
  PlusCircle,
  AlertTriangle,
  ArrowLeftRight
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";

export default function AdminCollegesPage() {
  const firestore = useFirestore();
  const collegesQuery = useMemo(() => firestore ? collection(firestore, "colleges") : null, [firestore]);
  const yearsQuery = useMemo(() => firestore ? collection(firestore, "academicYears") : null, [firestore]);

  const { data: colleges = [], loading: loadingColleges } = useCollection(collegesQuery);
  const { data: academicYears = [], loading: loadingYears } = useCollection(yearsQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("colleges");
  const [submitting, setSubmitting] = useState(false);
  
  // States for Colleges
  const [isAddCollegeOpen, setIsAddCollegeOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<any>(null);
  const [newCollege, setNewCollege] = useState({ name: '', code: '' });

  // States for Years
  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<any>(null);
  const [newYear, setNewYear] = useState({ startYear: '', endYear: '', label: '' });

  // Delete Dialog State
  const [deleteConfig, setDeleteDialog] = useState<{ isOpen: boolean, id: string, type: 'colleges' | 'academicYears', name: string }>({
    isOpen: false,
    id: '',
    type: 'colleges',
    name: ''
  });

  const { toast } = useToast();

  const filteredColleges = useMemo(() => {
    return (colleges as any[]).filter(college => 
      college.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      college.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [colleges, searchTerm]);

  const filteredYears = useMemo(() => {
    return (academicYears as any[]).filter(year => 
      year.label?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [academicYears, searchTerm]);

  // College Handlers
  const handleAddCollege = () => {
    if (!firestore || !newCollege.name || !newCollege.code) return;
    
    // منع تكرار اسم الكلية أو الرمز (تجاهل حالة الأحرف)
    const isDuplicate = (colleges as any[]).some((c) => 
      c.name?.trim().toLowerCase() === newCollege.name.trim().toLowerCase() || 
      c.code?.trim().toLowerCase() === newCollege.code.trim().toLowerCase()
    );

    if (isDuplicate) {
      toast({ 
        variant: "destructive", 
        title: "بيانات مسجلة مسبقاً", 
        description: "اسم الكلية أو الرمز المدخل مستخدم بالفعل في النظام." 
      });
      return;
    }

    setSubmitting(true);
    const ref = collection(firestore, "colleges");
    const data = { 
      name: newCollege.name.trim(), 
      code: newCollege.code.trim().toUpperCase(), 
      createdAt: serverTimestamp() 
    };
    
    addDoc(ref, data)
      .then(() => {
        setIsAddCollegeOpen(false);
        setNewCollege({ name: '', code: '' });
        toast({ title: "تم تفعيل الكلية بنجاح" });
      })
      .finally(() => setSubmitting(false));
  };

  const handleUpdateCollege = () => {
    if (!firestore || !editingCollege) return;
    setSubmitting(true);
    const docRef = doc(firestore, "colleges", editingCollege.id);
    updateDoc(docRef, { 
      name: editingCollege.name || "", 
      code: editingCollege.code?.toUpperCase() || "" 
    })
      .then(() => {
        setEditingCollege(null);
        toast({ title: "تم تحديث بيانات الكلية" });
      })
      .finally(() => setSubmitting(false));
  };

  // Year Handlers
  const handleYearStartChange = (val: string) => {
    const start = parseInt(val);
    if (!isNaN(start)) {
      setNewYear({
        startYear: val,
        endYear: (start + 1).toString(),
        label: `${val} / ${start + 1}`
      });
    } else {
      setNewYear({ ...newYear, startYear: val, label: '' });
    }
  };

  const handleAddYear = () => {
    if (!firestore || !newYear.label) return;

    // منع تكرار العام الدراسي
    const isDuplicate = (academicYears as any[]).some((y) => y.label === newYear.label);
    if (isDuplicate) {
      toast({ variant: "destructive", title: "هذا العام الدراسي مسجل مسبقاً في النظام" });
      return;
    }

    setSubmitting(true);
    const ref = collection(firestore, "academicYears");
    const data = { label: newYear.label, createdAt: serverTimestamp() };
    addDoc(ref, data)
      .then(() => {
        setIsAddYearOpen(false);
        setNewYear({ startYear: '', endYear: '', label: '' });
        toast({ title: "تم إضافة العام الدراسي الجديد" });
      })
      .finally(() => setSubmitting(false));
  };

  const handleUpdateYear = () => {
    if (!firestore || !editingYear) return;
    setSubmitting(true);
    const docRef = doc(firestore, "academicYears", editingYear.id);
    updateDoc(docRef, { label: editingYear.label || "" })
      .then(() => {
        setEditingYear(null);
        toast({ title: "تم تحديث مسمى العام" });
      })
      .finally(() => setSubmitting(false));
  };

  const executeDelete = async () => {
    if (!firestore || !deleteConfig.id) return;
    try {
      await deleteDoc(doc(firestore, deleteConfig.type, deleteConfig.id));
      toast({ variant: "destructive", title: "تم الحذف بنجاح" });
      setDeleteDialog({ ...deleteConfig, isOpen: false });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل الحذف، يرجى المحاولة لاحقاً" });
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary mb-1">إدارة الموارد الأساسية</h1>
          <p className="text-muted-foreground font-bold">التحكم في هيكلية الكليات والسنوات الدراسية</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="bg-white p-1 rounded-2xl h-14 shadow-sm border mb-8 flex items-stretch overflow-hidden">
          <TabsTrigger 
            value="colleges" 
            className={cn(
              "flex-1 rounded-xl font-black transition-all duration-300",
              activeTab === "colleges" ? "gradient-blue text-white shadow-lg" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            إدارة الكليات
          </TabsTrigger>
          <TabsTrigger 
            value="years" 
            className={cn(
              "flex-1 rounded-xl font-black transition-all duration-300",
              activeTab === "years" ? "gradient-blue text-white shadow-lg" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            الأعوام الدراسية
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              placeholder={activeTab === 'colleges' ? "البحث بالاسم أو الرمز..." : "البحث بالعام..."}
              className="w-full bg-white outline-none text-sm font-bold text-primary h-12 pr-12 pl-4 rounded-2xl border shadow-sm focus:border-primary/20 transition-all text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => activeTab === 'colleges' ? setIsAddCollegeOpen(true) : setIsAddYearOpen(true)}
            className="rounded-2xl h-12 px-8 font-bold gradient-blue shadow-lg gap-2 text-white"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'colleges' ? 'إضافة كلية' : 'إضافة عام دراسي'}
          </Button>
        </div>

        <TabsContent value="colleges" className="animate-slide-up">
          <Card className="border-none shadow-xl rounded-2xl bg-white overflow-hidden">
            <Table className="text-right">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right font-bold text-primary">الكلية</TableHead>
                  <TableHead className="text-right font-bold text-primary">الرمز</TableHead>
                  <TableHead className="text-center font-bold text-primary w-32">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingColleges ? (
                  <TableRow><TableCell colSpan={3} className="h-40 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20 text-primary" /></TableCell></TableRow>
                ) : filteredColleges.length > 0 ? filteredColleges.map((college) => (
                  <TableRow key={college.id} className="hover:bg-muted/10 group">
                    <TableCell className="p-4 font-bold text-primary">{college.name}</TableCell>
                    <TableCell className="font-black text-secondary">{college.code}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingCollege(college)} className="text-secondary hover:bg-secondary/10 rounded-xl"><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ isOpen: true, id: college.id, type: 'colleges', name: college.name })} className="text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow><TableCell colSpan={3} className="h-40 text-center text-muted-foreground font-bold">لا توجد كليات مسجلة</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="years" className="animate-slide-up">
          <Card className="border-none shadow-xl rounded-2xl bg-white overflow-hidden">
            <Table className="text-right">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right font-bold text-primary">العام الجامعي</TableHead>
                  <TableHead className="text-right font-bold text-primary">تاريخ الإضافة</TableHead>
                  <TableHead className="text-center font-bold text-primary w-32">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingYears ? (
                  <TableRow><TableCell colSpan={3} className="h-40 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20 text-primary" /></TableCell></TableRow>
                ) : filteredYears.length > 0 ? filteredYears.map((year) => (
                  <TableRow key={year.id} className="hover:bg-muted/10">
                    <TableCell className="p-4 font-black text-primary text-lg">{year.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-bold">{year.createdAt?.toDate ? year.createdAt.toDate().toLocaleDateString('en-GB') : '---'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingYear(year)} className="text-secondary hover:bg-secondary/10 rounded-xl"><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ isOpen: true, id: year.id, type: 'academicYears', name: year.label })} className="text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="h-40 text-center text-muted-foreground font-bold">لا توجد أعوام دراسية مسجلة</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Universal Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfig.isOpen} onOpenChange={(open) => setDeleteDialog({ ...deleteConfig, isOpen: open })}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
          <AlertDialogHeader className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2 w-full text-right">
              <AlertDialogTitle className="text-xl font-black text-primary">تأكيد عملية الحذف</AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                أنت على وشك حذف <span className="text-red-600 font-black">({deleteConfig.name})</span> بشكل نهائي. سيتم إزالة كافة السجلات المرتبطة بهذا المورد.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
            <AlertDialogAction 
              onClick={executeDelete} 
              className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1"
            >
              نعم، احذف المورد الآن
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all order-2">
              تراجع عن القرار
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* College Add Dialog */}
      <Dialog open={isAddCollegeOpen} onOpenChange={setIsAddCollegeOpen}>
        <DialogContent className="rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-8">
            <DialogHeader className="text-right items-start mb-6">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <School className="w-6 h-6 text-secondary" />
                كلية جديدة
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">أدخل بيانات الكلية الرسمية لتفعيلها في النظام.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2">
                  <Type className="w-4 h-4 text-secondary" />
                  الاسم الرسمي للكلية
                </Label>
                <div className="relative">
                  <Input 
                    value={newCollege.name || ""} 
                    onChange={(e) => setNewCollege({...newCollege, name: e.target.value})} 
                    placeholder="مثال: كلية الهندسة"
                    className="rounded-xl h-12 bg-muted/20 border-muted focus:ring-primary/20 pr-10" 
                  />
                  <School className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2">
                  <Hash className="w-4 h-4 text-secondary" />
                  الرمز المختصر
                </Label>
                <div className="relative">
                  <Input 
                    value={newCollege.code || ""} 
                    onChange={(e) => setNewCollege({...newCollege, code: e.target.value})} 
                    className="rounded-xl h-12 bg-muted/20 border-muted uppercase pr-10" 
                    placeholder="ENG"
                  />
                  <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-row gap-3 pt-6">
              <Button onClick={handleAddCollege} disabled={submitting} className="flex-1 rounded-xl h-12 font-bold gradient-blue shadow-lg gap-2 text-white">
                {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                تفعيل الكلية
              </Button>
              <Button variant="outline" onClick={() => setIsAddCollegeOpen(false)} className="flex-1 rounded-xl h-12 font-bold border-2">إلغاء</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Year Add Dialog */}
      <Dialog open={isAddYearOpen} onOpenChange={setIsAddYearOpen}>
        <DialogContent className="rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-8">
            <DialogHeader className="text-right items-start mb-6">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <Calendar className="w-6 h-6 text-secondary" />
                عام دراسي جديد
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground text-right">تحديد السنة الدراسية (سيتم احتساب السنة الثانية تلقائياً).</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="font-bold text-primary text-xs pr-1">السنة الأولى</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      placeholder="2025" 
                      value={newYear.startYear} 
                      onChange={(e) => handleYearStartChange(e.target.value)} 
                      className="rounded-xl h-12 bg-muted/20 border-muted pr-10 font-black text-center" 
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary text-xs pr-1">السنة الثانية</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      readOnly
                      placeholder="2026" 
                      value={newYear.endYear} 
                      className="rounded-xl h-12 bg-muted/10 border-muted pr-10 font-black text-center opacity-70" 
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {newYear.label && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center justify-between animate-slide-up">
                   <span className="text-xs font-bold text-muted-foreground">المسمى النهائي:</span>
                   <span className="text-lg font-black text-primary flex items-center gap-2">
                     {newYear.label}
                     <ArrowLeftRight className="w-4 h-4 text-secondary" />
                   </span>
                </div>
              )}
            </div>

            <DialogFooter className="flex-row gap-3 pt-6">
              <Button onClick={handleAddYear} disabled={submitting || !newYear.label} className="flex-1 rounded-xl h-12 font-bold gradient-blue shadow-lg gap-2 text-white">
                {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                إضافة العام
              </Button>
              <Button variant="outline" onClick={() => setIsAddYearOpen(false)} className="flex-1 rounded-xl h-12 font-bold border-2">إلغاء</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* College Edit Dialog */}
      <Dialog open={!!editingCollege} onOpenChange={(o) => !o && setEditingCollege(null)}>
        <DialogContent className="rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
           <div className="p-8">
             <DialogHeader className="text-right items-start mb-6">
                <DialogTitle className="font-black text-primary text-2xl flex items-center gap-2">
                  <Edit2 className="w-6 h-6 text-secondary" />
                  تعديل بيانات الكلية
                </DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground">تحديث بيانات الكلية المختارة.</DialogDescription>
             </DialogHeader>
             <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="font-bold text-primary flex items-center gap-2">
                    <Type className="w-4 h-4 text-secondary" />
                    الاسم الرسمي
                  </Label>
                  <div className="relative">
                    <Input value={editingCollege?.name || ""} onChange={(e) => setEditingCollege({...editingCollege, name: e.target.value})} className="rounded-xl h-12 bg-muted/20 border-muted pr-10" />
                    <School className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary flex items-center gap-2">
                    <Hash className="w-4 h-4 text-secondary" />
                    الرمز المختصر
                  </Label>
                  <div className="relative">
                    <Input value={editingCollege?.code || ""} onChange={(e) => setEditingCollege({...editingCollege, code: e.target.value})} className="rounded-xl h-12 bg-muted/20 border-muted uppercase pr-10" />
                    <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
             </div>
             <DialogFooter className="flex-row gap-3 pt-6">
                <Button onClick={handleUpdateCollege} disabled={submitting} className="flex-1 h-12 font-bold rounded-xl gradient-blue shadow-lg gap-2 text-white">
                  {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                  حفظ التغييرات
                </Button>
                <Button variant="outline" onClick={() => setEditingCollege(null)} className="flex-1 h-12 font-bold rounded-xl border-2">تراجع</Button>
             </DialogFooter>
           </div>
        </DialogContent>
      </Dialog>

      {/* Year Edit Dialog */}
      <Dialog open={!!editingYear} onOpenChange={(o) => !o && setEditingYear(null)}>
        <DialogContent className="rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
           <div className="p-8">
             <DialogHeader className="text-right items-start mb-6">
                <DialogTitle className="font-black text-primary text-2xl flex items-center gap-2">
                  <Edit2 className="w-6 h-6 text-secondary" />
                  تعديل العام الدراسي
                </DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground text-right">تحديث تسمية العام الدراسي المختار.</DialogDescription>
             </DialogHeader>
             <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="font-bold text-primary flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-secondary" />
                    تسمية العام
                  </Label>
                  <div className="relative">
                    <Input value={editingYear?.label || ""} onChange={(e) => setEditingYear({...editingYear, label: e.target.value})} className="rounded-xl h-12 bg-muted/20 border-muted pr-10 font-bold text-right" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
             </div>
             <DialogFooter className="flex-row gap-3 pt-6">
                <Button onClick={handleUpdateYear} disabled={submitting} className="flex-1 h-12 font-bold rounded-xl gradient-blue shadow-lg gap-2 text-white">
                  {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                  تحديث
                </Button>
                <Button variant="outline" onClick={() => setEditingYear(null)} className="flex-1 h-12 font-bold rounded-xl border-2">إلغاء</Button>
             </DialogFooter>
           </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
