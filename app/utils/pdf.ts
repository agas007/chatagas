// @ts-ignore
import * as pdfjsLib from "pdfjs-dist";

// Use the local worker from the public folder to bypass all bundling issues
/**
 * Extraction PDF using local pdfjs-dist dependency v4.x and a local worker file
 */
export async function extractPdfText(file: File): Promise<string> {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // @ts-ignore
          const textItems = textContent.items.map(
            (item: any) => item.str || item.content || "",
          );
          fullText += textItems.join(" ") + "\n";
        }
        resolve(fullText);
      } catch (err) {
        console.error("[PDF] Extraction error", err);
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
