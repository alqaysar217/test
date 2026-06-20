
"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FileText,
  ShieldCheck,
  School,
  Loader2,
  Filter,
  Type,
  AlertTriangle
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
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function AdminDepartmentsPage() {
  const firestore = useFirestore();
  const deptsQuery = useMemo(() => firestore ? collection(firestore, "departments") : null, [firestore]);
  const collegesQuery = useMemo(() => firestore ? collection(firestore, "colleges") : null, [firestore]);

  const { data: departments = [], loading } = useCollection(deptsQuery);
  const { data: colleges = [] } = useCollection(collegesQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newDept, setNewDept] = useState({ nameAr: '', nameEn: '', code: '', collegeId: '' });
  
  const { toast } = useToast();

  const filteredDepartments = useMemo(() => {
    return (departments as any[]).filter(dept => {
      const nameToSearch = (dept.nameAr || dept.name || "").toLowerCase();
      const nameEnToSearch = (dept.nameEn || "").toLowerCase();
      const codeToSearch = (dept.code || "").toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = nameToSearch.includes(term) || 
                           nameEnToSearch.includes(term) ||
                           codeToSearch.includes(term);
      const matchesCollege = filterCollege === "all" || dept.collegeId === filterCollege;
      return matchesSearch && matchesCollege;
    });
  }, [departments, searchTerm, filterCollege]);

  const handleAddDept = () => {
    if (!firestore || !newDept.nameAr || !newDept.code || !newDept.collegeId) {
      toast({ variant: "destructive", title: "بيانات ناقصة" });
      return;
    }

    // منع تكرار اسم القسم أو الرمز في نفس الكلية
    const isDuplicate = (departments as any[]).some((d) => 
      d.collegeId === newDept.collegeId && 
      (d.nameAr?.trim().toLowerCase() === newDept.nameAr.trim().toLowerCase() || 
       d.code?.trim().toLowerCase() === newDept.code.trim().toLowerCase())
    );

    if (isDuplicate) {
      toast({ 
        variant: "destructive", 
        title: "بيانات مسجلة مسبقاً", 
        description: "هذا القسم أو الرمز مستخدم بالفعل في هذه الكلية." 
      });
      return;
    }

    setSubmitting(true);
    const selectedCollege = (colleges as any[]).find(c => c.id === newDept.collegeId);
    const deptsRef = collection(firestore, "departments");
    const data = {
      ...newDept,
      collegeName: selectedCollege?.name || "",
      createdAt: serverTimestamp()
    };

    addDoc(deptsRef, data)
      .then(() => {
        setIsAddDialogOpen(false);
        setNewDept({ nameAr: '', nameEn: '', code: '', collegeId: '' });
        toast({ title: "تم التفعيل", description: "تم إنشاء القسم وتفعيله بنجاح." });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: deptsRef.path,
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setSubmitting(false));
  };

  const handleUpdateDept = () => {
    if (!firestore || !editingDept?.nameAr || !editingDept?.code || !editingDept?.collegeId) return;

    // منع تكرار اسم القسم أو الرمز في نفس الكلية (باستثناء السجل الحالي)
    const isDuplicate = (departments as any[]).some((d) => 
      d.id !== editingDept.id &&
      d.collegeId === editingDept.collegeId && 
      (d.nameAr?.trim().toLowerCase() === editingDept.nameAr.trim().toLowerCase() || 
       d.code?.trim().toLowerCase() === editingDept.code.trim().toLowerCase())
    );

    if (isDuplicate) {
      toast({ 
        variant: "destructive", 
        title: "بيانات مسجلة مسبقاً", 
        description: "الاسم أو الرمز المدخل مستخدم بالفعل في هذه الكلية." 
      });
      return;
    }

    setSubmitting(true);
    const selectedCollege = (colleges as any[]).find(c => c.id === editingDept.collegeId);
    const docRef = doc(firestore, "departments", editingDept.id);
    const data = {
      nameAr: editingDept.nameAr,
      nameEn: editingDept.nameEn || "",
      code: editingDept.code,
      collegeId: editingDept.collegeId,
      collegeName: selectedCollege?.name || "",
      updatedAt: serverTimestamp()
    };

    updateDoc(docRef, data)
      .then(() => {
        setEditingDept(null);
        toast({ title: "تم التحديث", description: "تم تحديث بيانات القسم بنجاح." });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "departments", id);

    deleteDoc(docRef)
      .then(() => {
        toast({
          variant: "destructive",
          title: "تم حذف التخصص",
          description: "تمت إزالة القسم العلمي من قاعدة البيانات المركزية.",
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary mb-1">إدارة الأقسام العلمية</h1>
          <p className="text-muted-foreground font-bold">التحكم في هيكلية الكليات والتخصصات والأقسام الإدارية</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-12 px-6 font-bold gradient-blue shadow-lg gap-2 text-white">
              <Plus className="w-5 h-5" />
              إضافة قسم إداري
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
            <div className="p-8">
              <DialogHeader className="text-right items-start space-y-2 mb-8">
                <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-secondary" />
                  إضافة قسم جديد
                </DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground text-sm">
                  إنشاء قسم علمي جديد في السجلات المركزية للنظام مع تحديد المسميات العربية والإنجليزية.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-2 text-right md:col-span-2">
                  <Label className="text-primary font-bold flex items-center gap-2 justify-start mb-1">
                    <School className="w-4 h-4 text-secondary" />
                    الكلية التابع لها
                  </Label>
                  <Select dir="rtl" onValueChange={(v) => setNewDept({...newDept, collegeId: v})}>
                    <SelectTrigger className="rounded-xl h-11 border-muted text-right font-bold">
                      <SelectValue placeholder="اختر الكلية" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl font-bold">
                      {colleges.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 text-right">
                  <Label className="text-primary font-bold flex items-center gap-2 justify-start mb-1">
                    <Type className="w-4 h-4 text-secondary" />
                    اسم القسم (بالعربي)
                  </Label>
                  <input 
                    value={newDept.nameAr}
                    onChange={(e) => setNewDept({...newDept, nameAr: e.target.value})}
                    placeholder="مثال: هندسة الحاسوب" 
                    className="flex h-11 w-full rounded-xl border border-muted bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right font-bold" 
                  />
                </div>

                <div className="space-y-2 text-right">
                  <Label className="text-primary font-bold flex items-center gap-2 justify-start mb-1">
                    <Type className="w-4 h-4 text-secondary" />
                    اسم القسم (English)
                  </Label>
                  <input 
                    value={newDept.nameEn}
                    onChange={(e) => setNewDept({...newDept, nameEn: e.target.value})}
                    placeholder="Computer Engineering" 
                    className="flex h-11 w-full rounded-xl border border-muted bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left font-mono" 
                  />
                </div>

                <div className="space-y-2 text-right md:col-span-2">
                  <Label className="text-primary font-bold flex items-center gap-2 justify-start mb-1">
                    <FileText className="w-4 h-4 text-secondary" />
                    رمز القسم المختصر
                  </Label>
                  <input 
                    value={newDept.code}
                    onChange={(e) => setNewDept({...newDept, code: e.target.value})}
                    placeholder="مثال: CE" 
                    className="flex h-11 w-full rounded-xl border border-muted bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right font-bold uppercase" 
                  />
                </div>
              </div>
              <DialogFooter className="flex-row gap-3 pt-8">
                <Button 
                  disabled={submitting}
                  onClick={handleAddDept}
                  className="flex-1 rounded-xl h-12 font-bold gradient-blue shadow-lg text-white"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تفعيل القسم"}
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold border-2">إلغاء</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6 border-none shadow-xl rounded-3xl bg-white">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-[2] relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              placeholder="البحث باسم القسم (عربي/انجليزي)، الرمز..."
              className="w-full bg-muted/30 outline-none text-sm font-bold text-primary h-12 pr-12 pl-4 rounded-2xl border border-transparent focus:border-primary/20 transition-all text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1">
             <Select value={filterCollege} onValueChange={setFilterCollege}>
               <SelectTrigger className="rounded-2xl h-12 bg-muted/30 border-none font-bold text-primary">
                 <Filter className="w-4 h-4 ml-2 opacity-50" />
                 <SelectValue placeholder="تصفية حسب الكلية" />
               </SelectTrigger>
               <SelectContent className="rounded-xl font-bold">
                 <SelectItem value="all">كل الكليات</SelectItem>
                 {colleges.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
               </SelectContent>
             </Select>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <Table className="text-right">
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="text-right font-bold text-primary">القسم العلمي</TableHead>
                <TableHead className="text-right font-bold text-primary">الرمز</TableHead>
                <TableHead className="text-right font-bold text-primary">الكلية</TableHead>
                <TableHead className="text-center font-bold text-primary w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : filteredDepartments.length > 0 ? filteredDepartments.map((dept) => (
                <TableRow key={dept.id} className="hover:bg-muted/20 border-b group">
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">{dept.nameAr || dept.name || "قسم بدون اسم"}</span>
                        {dept.nameEn && <span className="text-[10px] text-muted-foreground font-mono">{dept.nameEn}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-black text-secondary">{dept.code}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-bold text-muted-foreground">{dept.collegeName}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setEditingDept({
                          ...dept,
                          nameAr: dept.nameAr || dept.name || ""
                        })}
                        className="rounded-xl hover:bg-primary/5 text-secondary"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl hover:bg-destructive/10 text-destructive"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
                          <AlertDialogHeader className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                              <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="space-y-2 w-full text-right">
                              <AlertDialogTitle className="text-xl font-black text-primary">تأكيد عملية الحذف</AlertDialogTitle>
                              <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                                أنت على وشك حذف قسم <span className="text-red-600 font-black">({dept.nameAr || dept.name})</span> بشكل نهائي. سيتم إزالة كافة السجلات المرتبطة به.
                              </AlertDialogDescription>
                            </div>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                            <AlertDialogAction 
                              onClick={() => handleDelete(dept.id)} 
                              className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1"
                            >
                              نعم، احذف القسم الآن
                            </AlertDialogAction>
                            <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all order-2">
                              تراجع عن القرار
                            </AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground font-bold">
                    لا توجد أقسام مطابقة للبحث
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
        <DialogContent className="max-w-2xl rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-8">
            <DialogHeader className="text-right items-start space-y-2 mb-8">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-secondary" />
                تعديل بيانات القسم
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">تحديث معلومات القسم المختار في السجلات المركزية.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-2 text-right md:col-span-2">
                <Label className="text-primary font-bold flex items-center gap-2 justify-start mb-1">
                  <School className="w-4 h-4 text-secondary" />
                  الكلية التابع لها
                </Label>
                <Select dir="rtl" value={editingDept?.collegeId || ""} onValueChange={(v) => setEditingDept({...editingDept, collegeId: v})}>
                  <SelectTrigger className="rounded-xl h-11 border-muted text-right font-bold">
                    <SelectValue placeholder="اختر الكلية" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    {colleges.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-right">
                <Label className="text-primary font-bold flex items-center gap-2 justify-start mb-1">
                  <Type className="w-4 h-4 text-secondary" />
                  اسم القسم (بالعربي)
                </Label>
                <input 
                  value={editingDept?.nameAr || ""}
                  onChange={(e) => setEditingDept({...editingDept, nameAr: e.target.value})}
                  className="flex h-11 w-full rounded-xl border border-muted bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right font-bold" 
                />
              </div>

              <div className="space-y-2 text-right">
                <Label className="text-primary font-bold flex items-center gap-2 justify-start mb-1">
                  <Type className="w-4 h-4 text-secondary" />
                  اسم القسم (English)
                </Label>
                <input 
                  value={editingDept?.nameEn || ""}
                  onChange={(e) => setEditingDept({...editingDept, nameEn: e.target.value})}
                  className="flex h-11 w-full rounded-xl border border-muted bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left font-mono" 
                />
              </div>

              <div className="space-y-2 text-right md:col-span-2">
                <Label className="text-primary font-bold flex items-center gap-2 justify-start mb-1">
                  <FileText className="w-4 h-4 text-secondary" />
                  رمز القسم المختصر
                </Label>
                <input 
                  value={editingDept?.code || ""}
                  onChange={(e) => setEditingDept({...editingDept, code: e.target.value})}
                  className="flex h-11 w-full rounded-xl border border-muted bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right font-bold uppercase" 
                />
              </div>
            </div>
            <DialogFooter className="flex-row gap-3 pt-8">
              <Button 
                disabled={submitting}
                onClick={handleUpdateDept}
                className="flex-1 rounded-xl h-12 font-bold gradient-blue shadow-lg text-white"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
              </Button>
              <Button variant="outline" onClick={() => setEditingDept(null)} className="flex-1 rounded-xl h-12 font-bold border-2">إلغاء</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
