"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { 
  History, 
  Search, 
  User, 
  Clock, 
  FileText, 
  Settings, 
  Trash2, 
  AlertCircle,
  Loader2,
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
import { Badge } from "@/components/ui/badge";

// Firebase
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";

export default function LogsPage() {
  const firestore = useFirestore();
  const logsQuery = useMemo(() => firestore ? query(collection(firestore, "logs"), orderBy("timestamp", "desc"), limit(100)) : null, [firestore]);
  const { data: logs = [], loading } = useCollection(logsQuery);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = useMemo(() => {
    return (logs as any[]).filter(log => 
      log.user?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.target?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const getActionBadge = (type: string) => {
    switch(type) {
      case 'upload': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none rounded-lg gap-1 font-black"><FileText className="w-3 h-3" /> رفع</Badge>;
      case 'update': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-lg gap-1 font-black"><Settings className="w-3 h-3" /> تعديل</Badge>;
      case 'delete': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none rounded-lg gap-1 font-black"><Trash2 className="w-3 h-3" /> حذف</Badge>;
      case 'archive': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none rounded-lg gap-1 font-black"><ArchiveIcon className="w-3 h-3" /> أرشفة</Badge>;
      case 'system': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none rounded-lg gap-1 font-black"><AlertCircle className="w-3 h-3" /> نظام</Badge>;
      default: return <Badge variant="outline" className="rounded-lg font-bold">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary mb-1">سجل العمليات المركزي</h1>
          <p className="text-muted-foreground font-bold text-sm">تتبع شامل لكافة النشاطات والعمليات المنفذة في النظام في الوقت الحقيقي</p>
        </div>
      </div>

      <Card className="p-6 border-none shadow-xl rounded-[2rem] bg-white">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              placeholder="البحث بالمستخدم، العملية، أو الهدف..."
              className="w-full bg-muted/30 outline-none text-sm font-bold text-primary h-12 pr-12 pl-4 rounded-2xl border border-transparent focus:border-primary/20 transition-all text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <Table className="text-right">
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="text-right font-black text-primary">المستخدم</TableHead>
                <TableHead className="text-right font-black text-primary">العملية</TableHead>
                <TableHead className="text-right font-black text-primary">التفاصيل / الهدف</TableHead>
                <TableHead className="text-right font-black text-primary">تاريخ الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-60 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/20 border-b group">
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-primary text-sm">{log.user}</span>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">{log.role === 'manager' ? 'مدير' : 'موظف'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.type)}
                      <span className="text-sm font-black text-primary">{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-muted-foreground max-w-[200px] truncate">
                    {log.target}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-primary">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString('ar-EG-u-nu-latn') : 'الآن'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString('ar-EG-u-nu-latn') : 'الآن'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center">
                        <History className="w-10 h-10 text-muted-foreground opacity-30" />
                      </div>
                      <h3 className="text-xl font-black text-primary">لا توجد سجلات بعد</h3>
                      <p className="text-muted-foreground font-bold text-sm">سيتم تسجيل كافة الأنشطة الإدارية هنا بمجرد حدوثها.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
