
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Archive, 
  Search, 
  Eye, 
  Trash2, 
  Edit2, 
  Loader2, 
  Save,
  X,
  BookOpen,
  Fingerprint,
  LayoutGrid,
  List,
  Download,
  PlayCircle,
  AlertTriangle,
  UserPlus,
  Building2,
  Layers,
  RefreshCw,
  Calendar,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/storage-utils";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";

export default function AdminArchivePage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchTriggered, setIsSearchTriggered] = useState(false);

  const [viewingArchive, setViewingArchive] = useState<any>(null);
  const [editingArchive, setEditingArchive] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsSearchTriggered(false);
  }, [searchTerm]);

  const archivesQuery = useMemo(() => (firestore && isSearchTriggered) ? collection(firestore, "archives") : null, [firestore, isSearchTriggered]);
  const { data: archives = [], loading } = useCollection(archivesQuery);

  const filteredArchives = useMemo(() => {
    if (!isSearchTriggered) return [];
    return (archives as any[]).filter(item => {
      const matchesSearch = 
        item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.studentRegId?.includes(searchTerm) || 
        item.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [archives, searchTerm, isSearchTriggered]);

  const handleUpdateArchive = async () => {
    if (!firestore || !editingArchive) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, "archives", editingArchive.id);
      const { id, ...updateData } = editingArchive;
      await updateDoc(docRef, { ...updateData, updatedAt: serverTimestamp() });
      toast({ title: "تم التحديث بنجاح" });
      setEditingArchive(null);
    } catch (error) {
      toast({ variant: "destructive", title: "فشل التحديث" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "archives", id));
      toast({ variant: "destructive", title: "تم حذف السجل نهائياً" });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  const handleDownload = async (item: any) => {
    const data = item.file_data || item.fileUrl;
    if (!data) return;
    toast({ title: "جاري تجهيز الملف..." });
    const fileName = `${item.studentName}_${item.subjectName}`;
    const result = await downloadFile(data, fileName);
    if (!result.success) toast({ variant: "destructive", title: "فشل تحميل الملف" });
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary mb-1">إدارة الأرشيف السحابي</h1>
          <p className="text-muted-foreground font-bold text-sm">مراجعة والتحكم في دفاتر الطلاب المخزنة</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border">
          <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')} className={cn("rounded-xl px-4 h-9", view === 'grid' && "gradient-blue shadow-md text-white")}><LayoutGrid className="w-4 h-4" />شبكة</Button>
          <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')} className={cn("rounded-xl px-4 h-9", view === 'list' && "gradient-blue shadow-md text-white")}><List className="w-4 h-4" />قائمة</Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-4 rounded-[2rem] shadow-xl border-none bg-white flex flex-col md:flex-row items-center gap-4">
          <div className="flex-[3] relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="بحث..." className="w-full h-14 pr-12 pl-4 rounded-2xl border-none bg-muted/20 outline-none font-bold" />
          </div>
          <Button onClick={() => setIsSearchTriggered(true)} className="h-14 rounded-2xl px-10 gradient-blue shadow-lg font-black text-white gap-2">عرض السجلات <PlayCircle className="w-5 h-5" /></Button>
        </Card>
      </div>

      {loading ? (
        <div className="py-40 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-primary opacity-20" /></div>
      ) : isSearchTriggered && filteredArchives.length > 0 ? (
        view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredArchives.map((item) => (
              <Card key={item.id} className="group overflow-hidden border-none shadow-lg rounded-2xl bg-white flex flex-col h-full hover:-translate-y-1 transition-all">
                <div className="relative aspect-[3/4] bg-muted/30 overflow-hidden shrink-0">
                  {item.thumbnail || (item.file_type && item.file_type.includes('image')) ? (
                    <Image 
                      src={item.thumbnail || item.file_data} 
                      alt="Exam" 
                      fill 
                      className="object-cover object-top" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-primary/5 group-hover:bg-primary/10 transition-colors">
                       <div className="w-16 h-16 rounded-3xl gradient-blue flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                          <FileText className="w-8 h-8 text-white" />
                       </div>
                       <Badge variant="outline" className="border-primary/20 text-primary font-black text-[8px] uppercase">
                          {item.file_type === "application/pdf" ? "PDF DOCUMENT" : "FILE"}
                       </Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" onClick={() => setViewingArchive(item)} className="bg-white text-primary rounded-lg h-9 w-9 shadow-lg"><Eye className="w-5 h-5" /></Button>
                    <Button size="icon" onClick={() => setEditingArchive(item)} className="bg-blue-500 text-white rounded-lg h-9 w-9 shadow-lg"><Edit2 className="w-5 h-5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="destructive" className="rounded-lg h-9 w-9 shadow-lg"><Trash2 className="w-5 h-5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
                        <AlertDialogHeader className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                          </div>
                          <div className="space-y-2 w-full text-right">
                            <AlertDialogTitle className="text-xl font-black text-primary">حذف أرشيف الطالب</AlertDialogTitle>
                            <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                              سيتم حذف دفتر الطالب <span className="text-red-600 font-black">({item.studentName})</span> نهائياً. لا يمكن التراجع.
                            </AlertDialogDescription>
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                          <AlertDialogAction onClick={() => handleDelete(item.id)} className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white border-none order-1">حذف نهائي</AlertDialogAction>
                          <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary order-2">إلغاء</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="absolute top-2 right-2">
                    {item.file_type === "application/pdf" && (
                      <Badge className="bg-red-500/90 text-[8px] font-black">PDF</Badge>
                    )}
                  </div>
                </div>
                <div className="p-4 text-right flex-1 flex flex-col">
                  <h3 className="text-sm font-black text-primary leading-tight line-clamp-2">{item.studentName}</h3>
                  <div className="mt-auto pt-3 border-t flex items-center justify-between text-[9px] font-bold text-muted-foreground/70">
                     <span>{item.studentRegId}</span>
                     <span>{item.subjectName}</span>
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
                    <TableHead className="text-right font-black text-primary">التخصص</TableHead>
                    <TableHead className="text-center font-black text-primary w-40">إجراءات المدير</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchives.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/10 border-b group transition-colors">
                      <TableCell className="p-4">
                        <div className="flex flex-col">
                          <span className="font-black text-primary text-sm">{item.studentName}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">{item.subjectName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">{item.studentRegId}</TableCell>
                      <TableCell className="text-xs font-bold text-secondary">{item.departmentName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                           <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-primary hover:bg-primary/5" onClick={() => setViewingArchive(item)} title="معاينة"><Eye className="w-4 h-4" /></Button>
                           <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-blue-600 hover:bg-blue-50" onClick={() => setEditingArchive(item)} title="تعديل"><Edit2 className="w-4 h-4" /></Button>
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
                                    <AlertDialogTitle className="text-xl font-black text-primary">حذف سجل إداري</AlertDialogTitle>
                                    <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                                      أنت على وشك حذف دفتر الطالب <span className="text-red-600 font-black">({item.studentName})</span> نهائياً. لا يمكن التراجع.
                                    </AlertDialogDescription>
                                  </div>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                                  <AlertDialogAction onClick={() => handleDelete(item.id)} className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1">حذف نهائي</AlertDialogAction>
                                  <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary order-2">إلغاء</AlertDialogCancel>
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
      ) : isSearchTriggered && (
        <div className="py-32 text-center bg-white rounded-[3rem] border-4 border-dashed max-w-2xl mx-auto">
          <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-black text-primary">لا توجد سجلات مطابقة</h3>
        </div>
      )}

      {/* View Dialog للمدير */}
      <Dialog open={!!viewingArchive} onOpenChange={(o) => !o && setViewingArchive(null)}>
        <DialogContent className="max-w-7xl h-[90vh] overflow-hidden p-0 border-none shadow-2xl rounded-3xl bg-background flex flex-col" dir="rtl">
          <DialogHeader className="p-6 border-b bg-white shrink-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary"><BookOpen className="w-6 h-6" /></div>
                   <div>
                      <DialogTitle className="text-xl font-black text-primary mb-1">{viewingArchive?.studentName}</DialogTitle>
                      <DialogDescription className="font-bold text-xs">قائمة العرض الإداري - {viewingArchive?.subjectName}</DialogDescription>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <Button onClick={() => handleDownload(viewingArchive)} className="rounded-xl font-black gradient-blue h-11 px-6 text-white gap-2">
                      <Download className="w-5 h-5" /> تحميل النسخة
                   </Button>
                </div>
             </div>
          </DialogHeader>
          {viewingArchive && (
            <div className="flex-1 flex overflow-hidden bg-neutral-100">
               <div className="w-80 p-8 bg-white border-l flex flex-col text-right overflow-y-auto">
                  <div className="space-y-4 bg-muted/20 p-5 rounded-2xl font-bold text-sm">
                     <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                       <span className="text-[10px] text-muted-foreground">اسم الطالب:</span>
                       <span className="text-primary font-black">{viewingArchive.studentName}</span>
                     </div>
                     <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                       <span className="text-[10px] text-muted-foreground">رقم القيد:</span>
                       <span className="text-primary font-black">{viewingArchive.studentRegId}</span>
                     </div>
                     <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                       <span className="text-[10px] text-muted-foreground">التخصص:</span>
                       <span className="text-secondary font-black">{viewingArchive.departmentName}</span>
                     </div>
                     <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                       <span className="text-[10px] text-muted-foreground">المادة:</span>
                       <span className="text-primary font-black">{viewingArchive.subjectName}</span>
                     </div>
                     <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                       <span className="text-[10px] text-muted-foreground">المستوى:</span>
                       <span className="text-primary font-black">{viewingArchive.level}</span>
                     </div>
                     <div className="flex flex-col gap-1 border-b border-white/50 pb-2">
                       <span className="text-[10px] text-muted-foreground">الفصل:</span>
                       <span className="text-secondary font-black">{viewingArchive.term}</span>
                     </div>
                     <div className="flex flex-col gap-1">
                       <span className="text-[10px] text-muted-foreground">العام الجامعي:</span>
                       <span className="text-primary font-black">{viewingArchive.year}</span>
                     </div>
                  </div>
               </div>
               <div className="flex-1 p-6 relative">
                  <div className="w-full h-full bg-white shadow-2xl rounded-2xl overflow-hidden relative border">
                     {viewingArchive.file_type === "application/pdf" ? (
                       <iframe src={`${viewingArchive.file_data}#toolbar=0`} className="w-full h-full" title="Admin Reader" />
                     ) : (
                       <div className="relative w-full h-full">
                          <Image src={viewingArchive.file_data || viewingArchive.thumbnail} alt="Full" fill className="object-contain" priority />
                       </div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog للمدير */}
      <Dialog open={!!editingArchive} onOpenChange={(o) => !o && setEditingArchive(null)}>
        <DialogContent className="max-w-3xl rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-8">
            <DialogHeader className="text-right items-start mb-8">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-secondary" />
                تعديل سجل الأرشيف الإداري
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">تحديث كافة البيانات المرتبطة بهذا الدفتر في السجلات المركزية.</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-2 col-span-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><UserPlus className="w-4 h-4 text-secondary" />اسم الطالب الكامل</Label>
                <Input value={editingArchive?.studentName || ""} onChange={(e) => setEditingArchive({...editingArchive, studentName: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><Fingerprint className="w-4 h-4 text-secondary" />رقم القيد</Label>
                <Input value={editingArchive?.studentRegId || ""} onChange={(e) => setEditingArchive({...editingArchive, studentRegId: e.target.value})} className="rounded-xl h-11 border-muted font-bold text-center" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><Building2 className="w-4 h-4 text-secondary" />التخصص العلمي</Label>
                <Input value={editingArchive?.departmentName || ""} onChange={(e) => setEditingArchive({...editingArchive, departmentName: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4 text-secondary" />اسم المادة</Label>
                <Input value={editingArchive?.subjectName || ""} onChange={(e) => setEditingArchive({...editingArchive, subjectName: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-secondary" />المستوى الدراسي</Label>
                <Input value={editingArchive?.level || ""} onChange={(e) => setEditingArchive({...editingArchive, level: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><RefreshCw className="w-4 h-4 text-secondary" />الفصل الدراسي</Label>
                <Input value={editingArchive?.term || ""} onChange={(e) => setEditingArchive({...editingArchive, term: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-primary flex items-center gap-2 mb-1"><Calendar className="w-4 h-4 text-secondary" />العام الجامعي</Label>
                <Input value={editingArchive?.year || ""} onChange={(e) => setEditingArchive({...editingArchive, year: e.target.value})} className="rounded-xl h-11 border-muted font-bold" />
              </div>
            </div>

            <DialogFooter className="flex-row gap-3 pt-8 border-t mt-6">
              <Button disabled={isSubmitting} onClick={handleUpdateArchive} className="flex-1 rounded-xl gradient-blue h-12 font-bold text-white shadow-lg gap-2">
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                حفظ التعديلات المركزية
              </Button>
              <Button variant="outline" onClick={() => setEditingArchive(null)} className="flex-1 rounded-xl h-12 font-bold border-2">تراجع</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
