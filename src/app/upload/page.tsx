"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  FileUp, 
  Trash2, 
  CheckCircle, 
  Loader2, 
  Scan, 
  BookOpen, 
  Cpu, 
  RefreshCcw, 
  Layers, 
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  RotateCcw,
  FileText,
  AlertCircle,
  XCircle,
  FileWarning,
  Building2,
  Calendar,
  AlertSquare
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSidebarToggle } from "@/components/providers/SidebarProvider";
import { compressImage, extractPdfCover, getBase64SizeKB } from "@/lib/storage-utils";
import { Badge } from "@/components/ui/badge";

// Firebase & AI Action
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { extractExamDetails } from "@/ai/flows/extract-exam-details";

interface ArchiveDocument {
  originalData: string; 
  coverImage: string;    
  type: 'image' | 'pdf';
  name: string;
  sizeKB: number;
}

interface AIResult {
  studentRegistrationId: string;
  studentName: string;
  extractedSubject: string;
  extractedDept: string;
  extractedCollege: string;
  extractedLevel: string;
  extractedTerm: string;
  fileData: string; 
  coverImage: string; 
  isVerified: boolean;
  dbDepartmentName?: string;
  status: 'pending' | 'success' | 'mismatch' | 'not_found' | 'error';
  errorMessage?: string;
  type: 'image' | 'pdf';
  sizeKB: number;
  matchScore: {
    subject: boolean;
    dept: boolean;
    level: boolean;
    term: boolean;
    college: boolean;
  };
}

export default function UploadPage() {
  const [activeMode, setActiveMode] = useState<'manual' | 'ai'>('manual');
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("جاري المعالجة...");
  
  const [context, setContext] = useState({ 
    year: '', 
    deptId: '', 
    deptName: '',
    level: '', 
    term: '',
    subjectId: '',
    subjectName: '',
    collegeName: '' // نحتاج الكلية هنا أيضاً للمطابقة
  });

  const [docs, setDocs] = useState<ArchiveDocument[]>([]);
  const [manualId, setManualId] = useState("");
  const [manualStudent, setManualStudent] = useState<{name: string, regId: string, deptName: string} | null>(null);
  const [aiResults, setAiResults] = useState<AIResult[]>([]);
  
  const { toast } = useToast();
  const { isOpen } = useSidebarToggle();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const firestore = useFirestore();

  const deptsQuery = useMemo(() => firestore ? collection(firestore, "departments") : null, [firestore]);
  const subjectsQuery = useMemo(() => firestore ? collection(firestore, "subjects") : null, [firestore]);
  const yearsQuery = useMemo(() => firestore ? collection(firestore, "academicYears") : null, [firestore]);
  const collegesQuery = useMemo(() => firestore ? collection(firestore, "colleges") : null, [firestore]);

  const { data: departments = [] } = useCollection(deptsQuery);
  const { data: allSubjects = [] } = useCollection(subjectsQuery);
  const { data: academicYears = [] } = useCollection(yearsQuery);
  const { data: collegesList = [] } = useCollection(collegesQuery);

  const filteredSubjects = useMemo(() => {
    if (!context.deptId || !context.level || !context.term) return [];
    return (allSubjects as any[]).filter(s => 
      s.departmentId === context.deptId && 
      s.level === context.level && 
      s.term === context.term
    );
  }, [allSubjects, context.deptId, context.level, context.term]);

  const verifyStudentInDB = async (regId: string) => {
    if (!firestore || !regId) return { isVerified: false };
    try {
      const q = query(collection(firestore, "students"), where("regId", "==", regId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        return { isVerified: true, dbStudentName: data.name, dbDepartmentName: data.departmentName };
      }
    } catch (e) {}
    return { isVerified: false };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setLoading(true);
    setLoadingText("جاري قراءة وضغط الملفات...");
    
    let processed = 0;
    const newDocs: ArchiveDocument[] = [];

    Array.from(fileList).forEach(async (file) => {
      const isPdf = file.type === 'application/pdf';
      const reader = new FileReader();

      reader.onload = async (event) => {
        if (event.target?.result) {
          const originalData = event.target.result as string;
          let coverImage = "";

          try {
            if (isPdf) {
              coverImage = await extractPdfCover(originalData);
            } else {
              const compressed = await compressImage(originalData, 0.5, 900);
              coverImage = compressed.data;
            }

            const sizeKB = getBase64SizeKB(originalData);

            newDocs.push({
              originalData: originalData,
              coverImage: coverImage,
              type: isPdf ? 'pdf' : 'image',
              name: file.name,
              sizeKB: sizeKB
            });
          } catch (err) {
            toast({ variant: "destructive", title: "خطأ في المعالجة", description: `فشل معالجة ملف ${file.name}` });
          }

          processed++;
          if (processed === fileList.length) {
            setDocs(prev => activeMode === 'manual' ? [newDocs[0]] : [...prev, ...newDocs]);
            setLoading(false);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const identifyManualStudent = async (regId: string) => {
    const cleanId = regId.trim().replace(/\s+/g, '');
    if (!cleanId) return;
    const check = await verifyStudentInDB(cleanId);
    if (check.isVerified) {
      setManualStudent({ name: check.dbStudentName!, regId: cleanId, deptName: check.dbDepartmentName! });
      toast({ title: "تم العثور على الطالب" });
    } else {
      setManualStudent(null);
      toast({ variant: "destructive", title: "الطالب غير مسجل", description: "رقم القيد غير موجود في قاعدة البيانات." });
    }
  };

  const processSingleDocAI = async (doc: ArchiveDocument): Promise<AIResult> => {
    try {
      const responseData = await extractExamDetails({ examImageDataUri: doc.coverImage });
      const regId = (responseData.studentRegistrationId || "").toString().replace(/[^\d]/g, '');
      const dbCheck = await verifyStudentInDB(regId);
      
      // منطق التحقق المتقاطع الذكي (Fuzzy Comparison)
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
      
      const subjectMatch = normalize(responseData.subjectName || "").includes(normalize(context.subjectName)) || 
                          normalize(context.subjectName).includes(normalize(responseData.subjectName || ""));
      
      const deptMatch = normalize(responseData.departmentName || "").includes(normalize(context.deptName)) || 
                       normalize(context.deptName).includes(normalize(responseData.departmentName || ""));

      const levelMatch = responseData.level?.includes(context.level.replace("المستوى ", "")) || 
                        context.level.includes(responseData.level || "");
      
      const termMatch = normalize(responseData.term || "").includes(normalize(context.term.replace("الفصل ", ""))) || 
                       normalize(context.term).includes(normalize(responseData.term || ""));

      const collegeMatch = normalize(responseData.collegeName || "").includes(normalize(context.collegeName)) || 
                          normalize(context.collegeName).includes(normalize(responseData.collegeName || ""));

      // يعتبر الملف غير مطابق إذا كانت المادة أو التخصص مختلفين تماماً
      const isMismatch = !subjectMatch || !deptMatch;

      return {
        studentRegistrationId: regId || "",
        studentName: dbCheck.isVerified ? dbCheck.dbStudentName! : (responseData.studentName || "غير متوفر"),
        extractedSubject: responseData.subjectName || "",
        extractedDept: responseData.departmentName || "",
        extractedCollege: responseData.collegeName || "",
        extractedLevel: responseData.level || "",
        extractedTerm: responseData.term || "",
        dbDepartmentName: dbCheck.dbDepartmentName || (dbCheck.isVerified ? "" : "غير مسجل"),
        fileData: doc.originalData, 
        coverImage: doc.coverImage,
        isVerified: dbCheck.isVerified,
        status: isMismatch ? 'mismatch' : (dbCheck.isVerified ? 'success' : 'not_found'),
        type: doc.type,
        sizeKB: doc.sizeKB,
        matchScore: {
          subject: subjectMatch,
          dept: deptMatch,
          level: levelMatch,
          term: termMatch,
          college: collegeMatch
        }
      };
    } catch (e: any) {
      return { 
        studentName: "فشل التحليل", 
        studentRegistrationId: "", 
        extractedSubject: "", extractedDept: "", extractedCollege: "", extractedLevel: "", extractedTerm: "",
        fileData: doc.originalData, 
        coverImage: doc.coverImage,
        isVerified: false,
        status: 'error',
        errorMessage: e.message,
        type: doc.type,
        sizeKB: doc.sizeKB,
        matchScore: { subject: false, dept: false, level: false, term: false, college: false }
      };
    }
  };

  const startAIAnalysis = async () => {
    if (docs.length === 0) return;
    setLoading(true);
    setLoadingText("جاري التحليل والتحقق من البيانات...");
    
    const results: AIResult[] = [];
    for (const docItem of docs) {
      const res = await processSingleDocAI(docItem);
      results.push(res);
    }
    
    setAiResults(results);
    setLoading(false);
  };

  const saveManualArchive = async () => {
    if (!firestore || !manualStudent || docs.length === 0) return;
    
    if (docs[0].sizeKB > 1000) {
      toast({ variant: "destructive", title: "الملف كبير جداً" });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(firestore, "archives"), {
        studentName: manualStudent.name,
        studentRegId: manualStudent.regId,
        subjectName: context.subjectName,
        subjectId: context.subjectId,
        file_data: docs[0].originalData,
        thumbnail: docs[0].coverImage, 
        file_type: docs[0].type === 'pdf' ? "application/pdf" : "image/jpeg",
        year: context.year,
        term: context.term,
        departmentId: context.deptId,
        departmentName: context.deptName,
        level: context.level,
        uploadedAt: serverTimestamp()
      });

      toast({ title: "تمت الأرشفة بنجاح" });
      setDocs([]);
      setManualId("");
      setManualStudent(null);
    } catch (e) {
      toast({ variant: "destructive", title: "فشل الحفظ" });
    } finally {
      setLoading(false);
    }
  };

  const saveBatchAI = async () => {
    const validResults = aiResults.filter(r => r.isVerified && r.sizeKB < 1000 && r.status !== 'mismatch');
    if (!firestore || validResults.length === 0) {
      toast({ variant: "destructive", title: "لا توجد ملفات جاهزة ومطابقة للأرشفة" });
      return;
    }

    setLoading(true);
    try {
      for (const res of validResults) {
        await addDoc(collection(firestore, "archives"), {
          studentRegId: res.studentRegistrationId,
          studentName: res.studentName,
          subjectName: context.subjectName,
          subjectId: context.subjectId,
          file_data: res.fileData,
          thumbnail: res.coverImage, 
          file_type: res.type === 'pdf' ? "application/pdf" : "image/jpeg",
          year: context.year,
          term: context.term,
          departmentId: context.deptId,
          departmentName: context.deptName,
          level: context.level,
          uploadedAt: serverTimestamp()
        });
      }
      
      toast({ title: `تمت أرشفة ${validResults.length} ملف بنجاح.` });
      setAiResults(aiResults.filter(r => !r.isVerified || r.sizeKB >= 1000 || r.status === 'mismatch'));
      if (aiResults.length === validResults.length) {
        setDocs([]);
        setStep(1);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ أثناء الحفظ" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-right" dir="rtl">
      <Sidebar />
      <Navbar />
      
      <main className={cn(
        "transition-all duration-300 p-4 md:p-10 animate-fade-in max-w-7xl mx-auto",
        isOpen ? "mr-0 md:mr-64" : "mr-0"
      )}>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 md:mb-12">
          <div className="text-center md:text-right">
            <h1 className="text-3xl md:text-4xl font-black text-primary mb-2 tracking-tight">بوابة الأرشفة</h1>
            <p className="text-muted-foreground font-bold text-sm">نظام التحقق الآلي من تطابق أوراق الامتحان مع السجلات</p>
          </div>

          <Tabs value={activeMode} onValueChange={(v: any) => { setActiveMode(v); setStep(1); setDocs([]); setAiResults([]); setManualId(""); setManualStudent(null); }} className="w-full md:w-[400px]">
            <TabsList className="grid w-full grid-cols-2 h-14 md:h-16 bg-white rounded-2xl p-1.5 shadow-xl border overflow-hidden">
              <TabsTrigger 
                value="manual" 
                className={cn(
                  "rounded-xl font-black text-sm transition-all duration-300",
                  activeMode === 'manual' ? "gradient-blue text-white shadow-lg data-[state=active]:bg-transparent" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                أرشفة يدوية
              </TabsTrigger>
              <TabsTrigger 
                value="ai" 
                className={cn(
                  "rounded-xl font-black text-sm transition-all duration-300",
                  activeMode === 'ai' ? "gradient-blue text-white shadow-lg data-[state=active]:bg-transparent" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                أرشفة ذكية
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-6 p-6">
            <Card className="p-10 rounded-[3rem] shadow-2xl bg-white flex flex-col items-center gap-6 max-w-md text-center border-t-8 border-primary">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <h3 className="font-black text-2xl text-primary">{loadingText}</h3>
            </Card>
          </div>
        )}

        {step === 1 && (
          <Card className="p-6 md:p-12 border-none shadow-2xl rounded-[2rem] bg-white animate-slide-up border-t-8 border-primary">
            <div className="flex items-center gap-4 mb-8 md:mb-10 border-b pb-6">
              <div className="p-3 bg-primary/5 rounded-2xl text-primary"><Layers className="w-8 h-8" /></div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-primary">تحديد تفاصيل المادة</h2>
                <p className="text-sm font-bold text-muted-foreground">الخطوة الأولى للربط الصحيح بالطلاب</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-10">
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">العام الجامعي</Label>
                <select value={context.year} onChange={(e) => setContext({...context, year: e.target.value})} className="w-full h-12 px-4 rounded-xl border-2 bg-muted/5 font-black text-sm outline-none focus:border-primary text-right">
                  <option value="">اختر العام...</option>
                  {academicYears.map((y: any) => <option key={y.id} value={y.label}>{y.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">الكلية</Label>
                <select onChange={(e) => setContext({...context, collegeName: e.target.value})} className="w-full h-12 px-4 rounded-xl border-2 bg-muted/5 font-black text-sm outline-none focus:border-primary text-right">
                  <option value="">اختر الكلية...</option>
                  {collegesList.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">القسم العلمي</Label>
                <select value={context.deptId} onChange={(e) => {
                  const sel = departments.find((d: any) => d.id === e.target.value) as any;
                  setContext({...context, deptId: e.target.value, deptName: sel?.nameAr || sel?.name || ""});
                }} className="w-full h-12 px-4 rounded-xl border-2 bg-muted/5 font-black text-sm outline-none focus:border-primary text-right">
                  <option value="">اختر القسم...</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">المستوى</Label>
                <select value={context.level} onChange={(e) => setContext({...context, level: e.target.value})} className="w-full h-12 px-4 rounded-xl border-2 bg-muted/5 font-black text-sm outline-none focus:border-primary text-right">
                  <option value="">اختر المستوى...</option>
                  {["المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع", "المستوى الخامس"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary text-xs mr-1">الفصل الدراسي</Label>
                <select value={context.term} onChange={(e) => setContext({...context, term: e.target.value})} className="w-full h-12 px-4 rounded-xl border-2 bg-muted/5 font-black text-sm outline-none focus:border-primary text-right">
                  <option value="">اختر الفصل...</option>
                  <option value="الفصل الأول">الفصل الأول</option>
                  <option value="الفصل الثاني">الفصل الثاني</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="font-black text-primary text-xs mr-1">المادة الدراسية</Label>
                <select 
                  value={context.subjectId} 
                  onChange={(e) => {
                    const sel = filteredSubjects.find((s: any) => s.id === e.target.value) as any;
                    setContext({...context, subjectId: e.target.value, subjectName: sel?.nameAr || ""});
                  }} 
                  className="w-full h-12 px-4 rounded-xl border-2 bg-muted/5 font-black text-sm text-primary outline-none focus:border-primary text-right"
                >
                  <option value="">{filteredSubjects.length > 0 ? "اختر المادة..." : "يرجى تحديد القسم والمستوى أولاً"}</option>
                  {filteredSubjects.map((s: any) => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
                </select>
              </div>
            </div>

            <Button onClick={() => setStep(2)} disabled={!context.subjectId} className="w-full md:w-auto md:px-20 h-16 rounded-2xl text-xl font-black gradient-blue shadow-2xl gap-4 text-white hover:scale-[1.02] transition-all mx-auto flex">
              متابعة لرفع الدفاتر <ArrowLeft className="w-6 h-6" />
            </Button>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-slide-up pb-20">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border-r-8 border-secondary">
               <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-secondary/5 rounded-2xl flex items-center justify-center text-secondary shrink-0"><BookOpen className="w-8 h-8" /></div>
                  <div className="text-right">
                    <h3 className="text-2xl font-black text-primary">{context.subjectName}</h3>
                    <p className="text-sm font-bold text-muted-foreground">{context.deptName} • {context.level} • {context.year}</p>
                  </div>
               </div>
               <Button variant="outline" size="sm" onClick={() => setStep(1)} className="rounded-xl font-black h-12 px-6 border-2 gap-2">
                 <RefreshCcw className="w-4 h-4" /> تغيير السياق
               </Button>
            </div>

            <Card className="p-8 border-none shadow-2xl rounded-[2rem] bg-white">
              <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-primary flex items-center gap-3">
                    <FileText className="w-7 h-7 text-secondary" />
                    الملفات المختارة
                    <Badge variant="secondary" className="bg-muted px-2.5 rounded-lg text-primary">{docs.length}</Badge>
                  </h2>
                  <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-secondary font-black hover:bg-secondary/5 rounded-xl text-sm">
                    <UserPlus className="w-5 h-5 ml-2" /> إضافة المزيد
                  </Button>
               </div>

              <div 
                onClick={() => docs.length === 0 && fileInputRef.current?.click()}
                className={cn(
                  "w-full min-h-[220px] rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all",
                  docs.length === 0 ? "border-4 border-dashed border-muted cursor-pointer hover:border-primary hover:bg-primary/5" : "bg-muted/10 p-8"
                )}
              >
                {docs.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-5 w-full">
                    {docs.map((doc, i) => (
                      <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md group border-2 border-white bg-white">
                        <Image src={doc.coverImage} alt="Cover" fill className="object-cover" />
                        <div className="absolute top-0 left-0 w-full p-1.5 flex flex-col gap-1">
                           <Badge className={cn("text-[8px] font-black w-fit self-end", doc.type === 'pdf' ? "bg-red-500" : "bg-blue-500")}>
                             {doc.type.toUpperCase()}
                           </Badge>
                           <Badge className={cn("text-[8px] font-black w-fit self-end", doc.sizeKB > 1000 ? "bg-red-600 animate-pulse" : "bg-green-600")}>
                             {Math.round(doc.sizeKB/10.24)/100} MB
                           </Badge>
                        </div>
                        {aiResults.length === 0 && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                             <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg" onClick={(e) => { e.stopPropagation(); setDocs(prev => prev.filter((_, idx) => idx !== i)); }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2"><FileUp className="w-10 h-10" /></div>
                    <p className="text-xl font-black text-primary">اسحب الدفاتر هنا</p>
                    <p className="text-sm font-bold text-muted-foreground">تأكد أن كل ملف لا يتجاوز 1MB.</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" multiple={activeMode === 'ai'} onChange={handleFileUpload} />
              
              {docs.length > 0 && activeMode === 'ai' && aiResults.length === 0 && (
                <Button onClick={startAIAnalysis} className="w-full mt-10 rounded-2xl font-black gradient-blue shadow-2xl text-white h-20 text-2xl hover:scale-[1.01] transition-all">
                  <Scan className="w-8 h-8 ml-4" /> تحليل الأغلفة والتحقق الذكي
                </Button>
              )}
            </Card>

            {aiResults.length > 0 && (
                <div className="space-y-8 animate-slide-up pb-20">
                  <div className="bg-white px-10 py-6 rounded-[2.5rem] shadow-xl border-r-8 border-green-500 flex items-center justify-between">
                     <div className="text-right">
                        <h2 className="text-2xl font-black text-primary">نتائج التحقق الذكي والمطابقة</h2>
                        <p className="text-muted-foreground font-bold">تم فحص {aiResults.length} دفاتر ومقارنتها ببيانات مادة ({context.subjectName})</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                     {aiResults.map((res, i) => (
                       <Card key={i} className={cn(
                         "p-6 rounded-[2.5rem] border-4 flex flex-col md:flex-row items-center gap-8 bg-white shadow-xl relative overflow-hidden transition-all", 
                         res.status === 'success' && res.sizeKB < 1000 ? "border-green-400" : 
                         res.status === 'mismatch' ? "border-orange-400 bg-orange-50/5" : "border-red-400 bg-red-50/5"
                        )}>
                          <div className="w-32 h-44 relative rounded-xl overflow-hidden shadow-lg shrink-0 border-2 border-white">
                             <Image src={res.coverImage} alt="Cover" fill className="object-cover" />
                          </div>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-right">
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground flex items-center gap-1"><UserPlus className="w-3 h-3" /> بيانات الطالب</Label>
                                <div className="h-10 rounded-xl px-3 bg-muted/20 flex items-center font-black text-xs truncate">{res.studentName}</div>
                                <div className={cn("h-10 rounded-xl px-3 flex items-center font-black text-sm justify-center border-2", res.isVerified ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700")}>
                                  {res.studentRegistrationId || "???"}
                                </div>
                             </div>

                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3" /> المادة المستخرجة</Label>
                                <div className={cn("h-10 rounded-xl px-3 flex items-center font-bold text-xs truncate border-2", res.matchScore.subject ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-100 border-orange-300 text-orange-800")}>
                                   {res.extractedSubject || "لم يتم التعرف"}
                                </div>
                                {!res.matchScore.subject && (
                                  <p className="text-[9px] text-orange-600 font-bold flex items-center gap-1 mt-1"><FileWarning className="w-3.5 h-3.5" /> المادة غير مطابقة!</p>
                                )}
                             </div>

                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> التخصص والمستوى</Label>
                                <div className={cn("h-10 rounded-xl px-3 flex items-center font-bold text-[10px] truncate border-2", res.matchScore.dept ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-100 border-orange-300 text-orange-800")}>
                                   {res.extractedDept || "تخصص غير معروف"}
                                </div>
                                <div className="flex gap-1.5 mt-1">
                                  <Badge variant="outline" className={cn("text-[8px] font-black h-6", res.matchScore.level ? "text-green-600 border-green-200" : "text-orange-600 border-orange-200")}>
                                    {res.extractedLevel || "المستوى ؟"}
                                  </Badge>
                                  <Badge variant="outline" className={cn("text-[8px] font-black h-6", res.matchScore.term ? "text-green-600 border-green-200" : "text-orange-600 border-orange-200")}>
                                    {res.extractedTerm || "الترم ؟"}
                                  </Badge>
                                </div>
                             </div>

                             <div className="flex flex-col justify-center gap-2">
                                {res.status === 'mismatch' ? (
                                  <div className="space-y-1.5">
                                    <Badge variant="destructive" className="bg-orange-500 text-white h-10 w-full text-[10px] font-black gap-2"><XCircle className="w-4 h-4" /> بيانات غير متطابقة</Badge>
                                    <p className="text-[8px] text-muted-foreground text-center font-bold">المادة أو القسم في الورقة لا يطابق خيارك</p>
                                  </div>
                                ) : res.sizeKB >= 1000 ? (
                                  <Badge variant="destructive" className="h-10 text-[10px] font-black gap-2"><AlertCircle className="w-4 h-4" /> الحجم كبير جداً</Badge>
                                ) : res.isVerified ? (
                                  <Badge className="bg-green-600 text-white h-10 text-[10px] font-black gap-2 shadow-md"><ShieldCheck className="w-4 h-4" /> جاهز للأرشفة</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 h-10 text-[10px] font-black gap-2 border-red-200"><AlertTriangle className="w-4 h-4" /> غير مسجل</Badge>
                                )}
                                <Button variant="ghost" onClick={() => setAiResults(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive h-8 text-[10px] font-black hover:bg-red-50 rounded-xl">إزالة من القائمة</Button>
                             </div>
                          </div>
                       </Card>
                     ))}
                  </div>

                  <Button 
                    onClick={saveBatchAI} 
                    disabled={aiResults.filter(r => r.isVerified && r.sizeKB < 1000 && r.status !== 'mismatch').length === 0}
                    className="w-full h-24 rounded-[3rem] text-3xl font-black gradient-blue shadow-2xl text-white gap-6 hover:scale-[1.01] transition-transform"
                  >
                    أرشفة الملفات المتطابقة ({aiResults.filter(r => r.isVerified && r.sizeKB < 1000 && r.status !== 'mismatch').length})
                  </Button>
                </div>
              )
            }

            {activeMode === 'manual' && docs.length > 0 && aiResults.length === 0 && (
                <Card className="p-10 border-none shadow-2xl rounded-[2rem] bg-white animate-slide-up border-b-8 border-green-500">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-black text-primary flex items-center gap-3"><CheckCircle2 className="w-7 h-7 text-green-600" /> التحقق اليدوي والحفظ</h2>
                     {docs[0].sizeKB > 1000 && <Badge variant="destructive" className="animate-pulse h-10 px-4 text-sm gap-2"><AlertTriangle className="w-4 h-4" /> الملف كبير جداً</Badge>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="space-y-2">
                        <Label className="font-black text-primary text-sm mr-1">رقم القيد الجامعي</Label>
                        <div className="flex gap-2">
                          <Input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="0000" className="h-14 rounded-xl border-2 font-black text-xl text-center" onKeyDown={(e) => e.key === 'Enter' && identifyManualStudent(manualId)} />
                          <Button onClick={() => identifyManualStudent(manualId)} className="h-14 w-14 rounded-xl gradient-blue text-white shrink-0"><Search className="w-6 h-6" /></Button>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label className="font-black text-primary text-sm mr-1">اسم الطالب (من السجلات)</Label>
                        <div className={cn("h-14 bg-muted/20 border-2 border-transparent rounded-xl px-4 flex items-center font-black text-lg", manualStudent ? "text-primary bg-primary/5" : "text-muted-foreground")}>{manualStudent?.name || "---"}</div>
                     </div>
                     <div className="space-y-2">
                        <Label className="font-black text-primary text-sm mr-1">حجم ملف الدفتر</Label>
                        <div className={cn("h-14 bg-muted/20 border-2 border-transparent rounded-xl px-4 flex items-center font-black text-lg", docs[0].sizeKB > 1000 ? "text-red-600" : "text-green-600")}>
                          {Math.round(docs[0].sizeKB/10.24)/100} MB
                        </div>
                     </div>
                  </div>
                  {manualStudent && (
                    <Button onClick={saveManualArchive} disabled={docs[0].sizeKB > 1000} className="w-full mt-12 h-20 rounded-[2.5rem] text-2xl font-black bg-green-600 hover:bg-green-700 shadow-2xl text-white gap-4">
                      اعتماد وأرشفة الدفتر
                    </Button>
                  )}
                </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
