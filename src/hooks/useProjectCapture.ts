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

// Viewport height for capture segments (pixels)
const SEGMENT_HEIGHT = 800;

interface GameDataForCapture {
  actors: { id: string; name: string }[];
  scenes: { id: string; name: string }[];
  drops: { id: string; name: string }[];
  items: { id: string; name: string }[];
  sfx: { id: string; name: string }[];
  buttons: { id: string; name: string }[];
}

export function useProjectCapture(
  setSelection: (selection: { type: EditorType; id: string | null }) => void,
  projectTitle: string,
  navigateToEditor?: () => void,
  getGameData?: () => GameDataForCapture
) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  const captureElement = useCallback(async (selector: string): Promise<CapturedScreen | null> => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return null;
    }

    // Add capturing attribute to disable truncation during capture
    document.body.setAttribute('data-capturing', 'true');
    
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#121212',
        scale: 2.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1600,
        windowHeight: 900,
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
    } finally {
      document.body.removeAttribute('data-capturing');
    }
  }, []);

  const waitForRender = useCallback((ms: number = 300) => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        setTimeout(resolve, ms);
      });
    });
  }, []);

  // Capture scrollable content in segments
  const captureScrollableElement = useCallback(async (
    selector: string,
    label: string,
    type: string
  ): Promise<CapturedScreen[]> => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return [];
    }

    // Find the scrollable container within the element
    const scrollContainer = element.querySelector('[data-scroll-area]') as HTMLElement || element;
    
    const totalHeight = scrollContainer.scrollHeight;
    const viewportHeight = Math.min(scrollContainer.clientHeight, SEGMENT_HEIGHT);
    const segments = Math.max(1, Math.ceil(totalHeight / viewportHeight));
    
    const captures: CapturedScreen[] = [];
    
    // Store original scroll position
    const originalScroll = scrollContainer.scrollTop;
    
    for (let i = 0; i < segments; i++) {
      // Scroll to segment position
      scrollContainer.scrollTop = i * viewportHeight;
      await waitForRender(250);
      
      // Add capturing attribute to disable truncation during capture
      document.body.setAttribute('data-capturing', 'true');
      
      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#121212',
          scale: 2.5,
          logging: false,
          useCORS: true,
          allowTaint: true,
          windowWidth: 1600,
          windowHeight: 900,
        });

        captures.push({
          type,
          label: segments > 1 ? `${label} (${i + 1}/${segments})` : label,
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      } catch (error) {
        console.error(`Failed to capture segment ${i + 1}:`, error);
      } finally {
        document.body.removeAttribute('data-capturing');
      }
    }
    
    // Reset scroll position
    scrollContainer.scrollTop = originalScroll;
    
    return captures;
  }, [waitForRender]);

  const captureAllViews = useCallback(async (includeSplash: boolean = false) => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    setCaptureProgress(0);
    
    const captures: CapturedScreen[] = [];
    const toastId = toast.loading('Capturing project state...', { duration: Infinity });
    
    // Calculate total steps dynamically
    const gameData = getGameData?.();
    const splashStep = includeSplash ? 1 : 0;
    
    // Count how many categories have items (will have both list + edit views)
    let categoriesWithItems = 0;
    if (gameData) {
      if (gameData.actors.length > 0) categoriesWithItems++;
      if (gameData.scenes.length > 0) categoriesWithItems++;
      if (gameData.drops.length > 0) categoriesWithItems++;
      if (gameData.items.length > 0) categoriesWithItems++;
      if (gameData.sfx.length > 0) categoriesWithItems++;
      if (gameData.buttons.length > 0) categoriesWithItems++;
    }
    
    // Total: splash + settings + (categories with items * 2 for list+edit) + (empty categories * 1) + rest
    const nonSettingsViews = EDITOR_VIEWS.filter(v => v.type !== 'settings').length;
    const totalSteps = splashStep + 1 + categoriesWithItems * 2 + (nonSettingsViews - categoriesWithItems);
    let currentStep = 0;
    
    try {
      // Capture splash screen first if requested
      if (includeSplash) {
        toast.loading('Capturing Splash Screen... (0%)', { id: toastId });
        await waitForRender(500);
        
        const splashCapture = await captureElement('[data-capture-area="splash"]');
        if (splashCapture) {
          splashCapture.type = 'splash';
          splashCapture.label = 'Splash Screen';
          captures.push(splashCapture);
        }
        currentStep++;
        
        // Navigate to editor for remaining captures
        if (navigateToEditor) {
          navigateToEditor();
          await waitForRender(500);
        }
      }
      
      // Capture each editor view
      for (let i = 0; i < EDITOR_VIEWS.length; i++) {
        const view = EDITOR_VIEWS[i];
        
        // Get items for this category
        let items: { id: string; name: string }[] = [];
        if (gameData && view.type !== 'settings') {
          switch (view.type) {
            case 'actor': items = gameData.actors; break;
            case 'scene': items = gameData.scenes; break;
            case 'drop': items = gameData.drops; break;
            case 'item': items = gameData.items; break;
            case 'sfx': items = gameData.sfx; break;
            case 'button': items = gameData.buttons; break;
          }
        }
        
        // For settings, just capture once (no list/edit distinction)
        if (view.type === 'settings') {
          setSelection({ type: view.type, id: null });
          await waitForRender(400);
          
          currentStep++;
          const progress = Math.round((currentStep / totalSteps) * 100);
          setCaptureProgress(progress);
          toast.loading(`Capturing ${view.label}... (${progress}%)`, { id: toastId });
          
          const segmentCaptures = await captureScrollableElement(
            '[data-capture-area="editor"]',
            view.label,
            view.type
          );
          captures.push(...segmentCaptures);
          continue;
        }
        
        // STEP 1: Always capture the LIST view first (id: null)
        setSelection({ type: view.type, id: null });
        await waitForRender(400);
        
        currentStep++;
        let progress = Math.round((currentStep / totalSteps) * 100);
        setCaptureProgress(progress);
        toast.loading(`Capturing ${view.label} list... (${progress}%)`, { id: toastId });
        
        const listCaptures = await captureScrollableElement(
          '[data-capture-area="editor"]',
          view.label,
          view.type
        );
        captures.push(...listCaptures);
        
        // STEP 2: If items exist, also capture the EDIT view (first item selected)
        if (items.length > 0) {
          const firstItem = items[0];
          setSelection({ type: view.type, id: firstItem.id });
          await waitForRender(400);
          
          currentStep++;
          progress = Math.round((currentStep / totalSteps) * 100);
          setCaptureProgress(progress);
          const editLabel = `${view.label.slice(0, -1)}: ${firstItem.name || 'Untitled'}`;
          toast.loading(`Capturing ${editLabel}... (${progress}%)`, { id: toastId });
          
          const editCaptures = await captureScrollableElement(
            '[data-capture-area="editor"]',
            editLabel,
            `${view.type}-edit`
          );
          captures.push(...editCaptures);
        }
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
    }
  }, [isCapturing, setSelection, captureElement, captureScrollableElement, waitForRender, projectTitle, navigateToEditor, getGameData]);

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
