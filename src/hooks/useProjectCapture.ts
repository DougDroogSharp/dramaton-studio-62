import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

// Self-contained type to avoid circular imports
type EditorType = 'settings' | 'actor' | 'scene' | 'drop' | 'item' | 'sfx' | 'button';

interface EditorView {
  type: EditorType;
  label: string;
}

const EDITOR_VIEWS: EditorView[] = [
  { type: 'settings', label: 'Settings' },
  { type: 'actor', label: 'Actors' },
  { type: 'scene', label: 'Scenes' },
  { type: 'drop', label: 'Drops' },
  { type: 'item', label: 'Items' },
  { type: 'sfx', label: 'SFX' },
  { type: 'button', label: 'Buttons' },
];

interface CapturedScreen {
  type: string;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

export function useProjectCapture(
  setSelection: (selection: { type: EditorType; id: string | null }) => void,
  projectTitle: string,
  setShowRestPeriod?: (show: boolean) => void
) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  const captureElement = useCallback(async (selector: string): Promise<CapturedScreen | null> => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return null;
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#121212',
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      return {
        type: '',
        label: '',
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      };
    } catch (error) {
      console.error('Failed to capture element:', error);
      return null;
    }
  }, []);

  const waitForRender = useCallback((ms: number = 300) => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        setTimeout(resolve, ms);
      });
    });
  }, []);

  const captureAllViews = useCallback(async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    setCaptureProgress(0);
    
    const captures: CapturedScreen[] = [];
    const totalSteps = EDITOR_VIEWS.length + (setShowRestPeriod ? 1 : 0);
    const toastId = toast.loading('Capturing project state...', { duration: Infinity });
    
    try {
      // Capture each editor view
      for (let i = 0; i < EDITOR_VIEWS.length; i++) {
        const view = EDITOR_VIEWS[i];
        
        setSelection({ type: view.type, id: null });
        await waitForRender();
        
        const progress = Math.round(((i + 1) / totalSteps) * 100);
        setCaptureProgress(progress);
        toast.loading(`Capturing ${view.label}... (${progress}%)`, { id: toastId });
        
        const capture = await captureElement('[data-capture-area="editor"]');
        if (capture) {
          capture.type = view.type;
          capture.label = view.label;
          captures.push(capture);
        }
      }
      
      // Capture rest period screen (fake it)
      if (setShowRestPeriod) {
        toast.loading('Capturing Rest Period...', { id: toastId });
        setShowRestPeriod(true);
        await waitForRender(500); // Extra time for animations
        
        const restCapture = await captureElement('[data-capture-area="rest-period"]');
        if (restCapture) {
          restCapture.type = 'rest-period';
          restCapture.label = 'Rest Period';
          captures.push(restCapture);
        }
        
        setShowRestPeriod(false);
        await waitForRender(100);
      }
      
      if (captures.length === 0) {
        toast.error('No views captured', { id: toastId });
        return;
      }
      
      toast.loading('Generating PDF...', { id: toastId });
      await generatePDF(captures, projectTitle);
      toast.success(`Captured ${captures.length} screens!`, { id: toastId });
      
    } catch (error) {
      console.error('Capture failed:', error);
      toast.error('Failed to capture project state', { id: toastId });
    } finally {
      setIsCapturing(false);
      setCaptureProgress(0);
      if (setShowRestPeriod) setShowRestPeriod(false);
    }
  }, [isCapturing, setSelection, captureElement, waitForRender, projectTitle, setShowRestPeriod]);

  return {
    isCapturing,
    captureProgress,
    captureAllViews,
  };
}

async function generatePDF(captures: CapturedScreen[], projectTitle: string) {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const filename = `Dramaton_${projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  
  // Create PDF in landscape for better screen captures
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: 'a4',
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 30;
  const headerHeight = 60;
  
  // Title page
  pdf.setFillColor(18, 18, 18); // diesel-black
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setTextColor(218, 165, 32); // diesel-gold
  pdf.setFontSize(32);
  pdf.text('DRAMATON', pageWidth / 2, pageHeight / 2 - 60, { align: 'center' });
  
  pdf.setFontSize(24);
  pdf.setTextColor(200, 200, 200);
  pdf.text(projectTitle, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`State captured at ${timestamp}`, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.text(`${captures.length} screens captured`, pageWidth / 2, pageHeight / 2 + 45, { align: 'center' });
  
  // Add each capture as a page
  for (const capture of captures) {
    pdf.addPage();
    
    // Page background
    pdf.setFillColor(18, 18, 18);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Header
    pdf.setFillColor(30, 30, 30);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    
    pdf.setTextColor(218, 165, 32);
    pdf.setFontSize(18);
    pdf.text(capture.label.toUpperCase(), margin, 35);
    
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(10);
    pdf.text(timestamp, pageWidth - margin, 35, { align: 'right' });
    
    // Calculate image dimensions to fit page
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - headerHeight - (margin * 2);
    
    const imgAspect = capture.width / capture.height;
    const areaAspect = availableWidth / availableHeight;
    
    let imgWidth: number, imgHeight: number;
    if (imgAspect > areaAspect) {
      imgWidth = availableWidth;
      imgHeight = availableWidth / imgAspect;
    } else {
      imgHeight = availableHeight;
      imgWidth = availableHeight * imgAspect;
    }
    
    const imgX = margin + (availableWidth - imgWidth) / 2;
    const imgY = headerHeight + margin + (availableHeight - imgHeight) / 2;
    
    // Add screenshot with border
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(1);
    pdf.addImage(capture.dataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight);
    pdf.rect(imgX, imgY, imgWidth, imgHeight, 'S');
  }
  
  // Add page numbers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(10);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
  }
  
  // Save
  pdf.save(filename);
}
