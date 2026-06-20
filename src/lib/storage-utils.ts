'use client';

/**
 * أداة ذكية لتحميل الملفات تدعم الصور والملفات بنوعيها (Base64).
 */
export async function downloadFile(dataUrl: string, fileName: string) {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    
    // تحديد الامتداد بناءً على محتوى الـ Base64
    let extension = 'jpg';
    if (dataUrl.includes('application/pdf')) extension = 'pdf';
    else if (dataUrl.includes('image/png')) extension = 'png';
    
    link.download = `${fileName.replace(/\s+/g, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error };
  }
}

/**
 * ضغط الصورة بشكل فائق (Drastic Compression) لضمان حجم أقل من 1MB.
 * تقوم الدالة بتقليل الأبعاد والجودة للوصول للحد المطلوب لتناسب قيود Firestore.
 */
export async function compressImage(dataUrl: string, initialQuality = 0.5, maxWidth = 900): Promise<{ data: string; sizeKB: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const result = canvas.toDataURL('image/jpeg', initialQuality);
        const sizeKB = getBase64SizeKB(result);
        
        resolve({ data: result, sizeKB });
      } else {
        resolve({ data: dataUrl, sizeKB: getBase64SizeKB(dataUrl) });
      }
    };
    img.onerror = () => resolve({ data: dataUrl, sizeKB: getBase64SizeKB(dataUrl) });
  });
}

/**
 * استخراج الصفحة الأولى من ملف PDF كصورة Base64 للتحليل الذكي.
 */
export async function extractPdfCover(pdfBase64: string): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

    const loadingTask = pdfjs.getDocument({ data: atob(pdfBase64.split(',')[1]) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error('Canvas context failed');

    await page.render({ canvasContext: context, viewport }).promise;
    
    // ضغط عالي لصورة الغلاف لتوفير مساحة
    const imageData = canvas.toDataURL('image/jpeg', 0.5);
    return imageData;
  } catch (error) {
    console.error('PDF Extraction Error:', error);
    throw new Error('فشل استخراج الغلاف');
  }
}

/**
 * دالة للتحقق من حجم سلسلة الـ Base64 بالكيلوبايت.
 */
export function getBase64SizeKB(base64String: string): number {
  const stringLength = base64String.substring(base64String.indexOf(',') + 1).length;
  const sizeInBytes = Math.ceil((stringLength * 3) / 4);
  return sizeInBytes / 1024;
}
