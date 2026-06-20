'use server';

/**
 * @fileOverview محرك استخراج البيانات المطور للتحقق الشامل من محتوى غلاف الامتحان.
 * يستخرج كافة البيانات الأكاديمية لمقارنتها بسياق الأرشفة.
 *///

import { z } from 'zod';

const ExtractExamDetailsInputSchema = z.object({
  examImageDataUri: z.string().describe("صورة ورقة الامتحان كـ Data URI (Base64)"),
});

const ExtractExamDetailsOutputSchema = z.object({
  studentRegistrationId: z.string().optional().describe("رقم القيد الجامعي"),
  studentName: z.string().optional().describe("اسم الطالب الكامل"),
  subjectName: z.string().optional().describe("اسم المادة الدراسية المكتوب"),
  departmentName: z.string().optional().describe("اسم القسم أو التخصص المكتوب"),
  collegeName: z.string().optional().describe("اسم الكلية المكتوب"),
  level: z.string().optional().describe("المستوى الدراسي المكتوب"),
  term: z.string().optional().describe("الفصل الدراسي المكتوب"),
});

export type ExtractExamDetailsInput = z.infer<typeof ExtractExamDetailsInputSchema>;
export type ExtractExamDetailsOutput = z.infer<typeof ExtractExamDetailsOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function extractExamDetails(input: ExtractExamDetailsInput): Promise<ExtractExamDetailsOutput> {
  
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  } 

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mustand-archive.app',
        'X-Title': 'Mustand Smart Archive'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `أنت خبير أرشفة أكاديمي محترف في قراءة الخطوط العربية اليدوية الصعبة. 
                حلل صورة غلاف دفتر الامتحان المرفقة واستخرج البيانات التالية بدقة.
                
                قواعد هامة جداً للاستخراج:
                1. التعامل مع الأخطاء الإملائية: إذا كتب الطالب "علوم حاسدي" فالمقصود "علوم حاسوب". صحح الأخطاء الواضحة بناءً على السياق الأكاديمي.
                2. التعامل مع الاختصارات: إذا وجدت "IT" فالمقصود "تقنية معلومات"، وإذا وجدت "MIS" فالمقصود "نظم معلومات إدارية".
                3. رقم القيد: استخرجه كأرقام متصلة فقط بدون أي فواصل أو مسافات.
                4. المادة والتخصص: ركز جداً على قراءتها لأنها أساس الأرشفة الصحيحة.
                
البيانات المطلوبة:
1. studentRegistrationId: رقم القيد الجامعي.
2. studentName: اسم الطالب الكامل.
3. subjectName: اسم المادة الدراسية (صححها للمسمى الرسمي إذا كانت مختصرة).
4. departmentName: اسم القسم أو التخصص.
5. collegeName: اسم الكلية.
6. level: المستوى الدراسي (مثلاً: الأول، الثاني.. إلخ).
7. term: الفصل الدراسي (مثلاً: الأول، الثاني).

أجب فقط بصيغة JSON كالتالي:
{"studentRegistrationId": "...", "studentName": "...", "subjectName": "...", "departmentName": "...", "collegeName": "...", "level": "...", "term": "..."}

ملاحظة: إذا لم تجد أي قيمة أو لم تستطع قراءتها، اترك الحقل نصاً فارغاً "".`
              },
              {
                type: 'image_url',
                image_url: { url: input.examImageDataUri }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "فشل الاتصال بمحرك الاستخراج");
    }

    const content = JSON.parse(data.choices[0].message.content);
    const cleanRegId = (content.studentRegistrationId || "").toString().replace(/[^\d]/g, ''); // تنظيف رقم القيد ليكون أرقام فقط
    
    return {
      ...content,
      studentRegistrationId: cleanRegId
    };

  } catch (error: any) {
    console.error('AI Extraction Error:', error);
    throw new Error(`خطأ في التحليل الذكي: ${error.message}`);
  }
}
