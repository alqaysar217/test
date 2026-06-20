
"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  FileText, 
  AlertTriangle,
  Clock,
  Loader2,
  User,
  Archive as ArchiveIcon
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
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection } from "@/firebase";
import { collection, deleteDoc, doc, addDoc, writeBatch, getDocs } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";

export default function RecycleBinPage() {
  const firestore = useFirestore();
  const binQuery = useMemo(() => firestore ? collection(firestore, "recycleBin") : null, [firestore]);
  const { data: items = [], loading } = useCollection(binQuery);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const filteredItems = useMemo(() => {
    return (items as any[]).filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.identifier?.includes(searchTerm)
    );
  }, [items, searchTerm]);

  const handleRestore = async (item: any) => {
    if (!firestore) return;
    setIsProcessing(true);
    try {
      const collectionName = item.type === 'student' ? 'students' : 'archives';
      await addDoc(collection(firestore, collectionName), item.originalData);
      await deleteDoc(doc(firestore, "recycleBin", item.id));
      toast({ title: "تمت استعادة البيانات بنجاح" });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل في استعادة البيانات" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "recycleBin", id));
      toast({ variant: "destructive", title: "تم الحذف النهائي" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في الحذف" });
    }
  };

  const handleEmptyBin = async () => {
    if (!firestore) return;
    setIsProcessing(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, "recycleBin"));
      const batch = writeBatch(firestore);
      querySnapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      toast({ title: "تم تفريغ السلة تماماً" });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل تفريغ السلة" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary mb-1">سلة المحذوفات المركزية</h1>
          <p className="text-muted-foreground font-bold">إدارة الملفات والطلاب المحذوفين مؤقتاً بواسطة الموظفين</p>
        </div>

        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isProcessing} className="rounded-2xl h-12 px-6 font-bold gap-2 shadow-lg">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                تفريغ السلة نهائياً
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
              <AlertDialogHeader className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2 w-full text-right">
                  <AlertDialogTitle className="text-xl font-black text-primary">تفريغ السلة بالكامل؟</AlertDialogTitle>
                  <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                    أنت على وشك حذف <span className="text-red-600 font-black">كافة العناصر</span> نهائياً من السحابة. لا يمكن التراجع عن هذا الإجراء أبداً.
                  </AlertDialogDescription>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                <AlertDialogAction 
                  onClick={handleEmptyBin} 
                  className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1"
                >
                  نعم، احذف الكل نهائياً
                </AlertDialogAction>
                <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all order-2">
                  تراجع
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card className="p-6 border-none shadow-xl rounded-[2rem] bg-white">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              placeholder="البحث بالاسم أو الرقم التعريفي..."
              className="w-full bg-muted/30 outline-none text-sm font-bold text-primary h-12 pr-12 pl-4 rounded-2xl border border-transparent focus:border-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="text-right font-black text-primary">نوع البيانات</TableHead>
                <TableHead className="text-right font-black text-primary">الاسم / المادة</TableHead>
                <TableHead className="text-right font-black text-primary">تاريخ الحذف</TableHead>
                <TableHead className="text-center font-black text-primary w-40">إجراءات المدير</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-60 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : filteredItems.length > 0 ? filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/20 border-b group">
                  <TableCell>
                    {item.type === 'student' ? (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none rounded-lg gap-1 font-black"><User className="w-3 h-3" /> طالب</Badge>
                    ) : (
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none rounded-lg gap-1 font-black"><ArchiveIcon className="w-3 h-3" /> أرشيف</Badge>
                    )}
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex flex-col">
                      <span className="font-black text-primary text-base">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground font-bold">{item.identifier}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {item.deletedAt?.toDate ? item.deletedAt.toDate().toLocaleString('ar-EG-u-nu-latn') : 'غير محدد'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={isProcessing}
                        onClick={() => handleRestore(item)}
                        className="rounded-xl hover:bg-green-50 text-green-600 h-10 w-10 shadow-sm border border-transparent hover:border-green-100"
                        title="استرجاع للمكان الأصلي"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl hover:bg-red-50 text-red-600 h-10 w-10 shadow-sm border border-transparent hover:border-red-100"
                            title="حذف نهائي"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-6 max-w-[380px]" dir="rtl">
                          <AlertDialogHeader className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                              <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="space-y-2 w-full text-right">
                              <AlertDialogTitle className="text-xl font-black text-primary">حذف نهائي للأبد؟</AlertDialogTitle>
                              <AlertDialogDescription className="font-bold text-muted-foreground text-xs leading-relaxed">
                                سيتم حذف سجل <span className="text-red-600 font-black">({item.name})</span> بشكل نهائي من السحابة. لا يمكن استعادته مرة أخرى.
                              </AlertDialogDescription>
                            </div>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                            <AlertDialogAction 
                              onClick={() => handlePermanentDelete(item.id)} 
                              className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1"
                            >
                              نعم، احذف للأبد
                            </AlertDialogAction>
                            <AlertDialogCancel className="w-full rounded-xl font-black border-2 h-12 text-primary hover:bg-muted/50 transition-all order-2">
                              تراجع
                            </AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center gap-6">
                      <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center">
                        <Trash2 className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-primary mb-1">سلة المحذوفات فارغة</h3>
                        <p className="text-muted-foreground font-bold">كافة البيانات حالياً في أماكنها الصحيحة</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-lg bg-orange-50/50 border-r-4 border-orange-500 rounded-3xl">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="text-right">
            <h4 className="font-black text-orange-900 text-lg">صلاحيات المدير الخاصة</h4>
            <p className="text-sm text-orange-800 font-bold leading-relaxed">بصفتك مديراً للنظام، أنت الوحيد الذي يملك صلاحية رؤية هذه السلة. أي عملية حذف يقوم بها الموظفون لا تُمسح فعلياً بل تُرسل إلى هنا لتراجعها وتتخذ قرارك النهائي بالاستعادة أو المسح التام.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

