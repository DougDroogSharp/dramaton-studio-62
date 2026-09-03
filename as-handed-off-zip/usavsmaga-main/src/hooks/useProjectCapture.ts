import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

// Self-contained type to avoid circular imports
type EditorType = 'settings' | 'actor' | 'scene' | 'drop' | 'item' | 'sfx' | 'button' | 'episode' | 'page';

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
  { type: 'episode', label: 'Episodes' },
  { type: 'page', label: 'Pages' },
];

interface CapturedScreen {
  type: string;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

interface GameDataForCapture {
  actors: { id: string; name: string }[];
  scenes: { id: string; name: string }[];
  drops: { id: string; name: string }[];
  items: { id: string; name: string }[];
  sfx: { id: string; name: string }[];
  buttons: { id: string; name: string }[];
  episodes: { id: string; name: string }[];
  pages: { id: string; name: string }[];
}

export function useProjectCapture(
  setSelection: (selection: { type: EditorType; id: string | null }) => void,
  projectTitle: string,
  setShowRestPeriod?: (show: boolean) => void,
  navigateToEditor?: () => void,
  getGameData?: () => GameDataForCapture,
  navigateToSplash?: () => void,
  isOnSplash?: () => boolean,
  setRestPeriodOverride?: (override: boolean) => void
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
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1600,
        windowHeight: 900,
      });

      return {
        type: '',
        label: '',
        dataUrl: canvas.toDataURL('image/jpeg', 0.7),
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

  // Capture only top and bottom of a scrollable element (for editors)
  const captureTopAndBottom = useCallback(async (
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
    const viewportHeight = scrollContainer.clientHeight;
    const captures: CapturedScreen[] = [];
    
    // Store original scroll position
    const originalScroll = scrollContainer.scrollTop;
    
    // Only need 2 captures if content is scrollable, otherwise just 1
    const needsTwoCaptures = totalHeight > viewportHeight + 50; // 50px threshold
    
    // Capture 1: Top
    scrollContainer.scrollTop = 0;
    await waitForRender(250);
    
    document.body.setAttribute('data-capturing', 'true');
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#121212',
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1600,
        windowHeight: 900,
      });

      captures.push({
        type,
        label: needsTwoCaptures ? `${label} (Top)` : label,
        dataUrl: canvas.toDataURL('image/jpeg', 0.7),
        width: canvas.width,
        height: canvas.height,
      });
    } catch (error) {
      console.error('Failed to capture top:', error);
    } finally {
      document.body.removeAttribute('data-capturing');
    }
    
    // Capture 2: Bottom (only if content is scrollable)
    if (needsTwoCaptures) {
      scrollContainer.scrollTop = totalHeight - viewportHeight;
      await waitForRender(250);
      
      document.body.setAttribute('data-capturing', 'true');
      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#121212',
          scale: 1.5,
          logging: false,
          useCORS: true,
          allowTaint: true,
          windowWidth: 1600,
          windowHeight: 900,
        });

        captures.push({
          type,
          label: `${label} (Bottom)`,
          dataUrl: canvas.toDataURL('image/jpeg', 0.7),
          width: canvas.width,
          height: canvas.height,
        });
      } catch (error) {
        console.error('Failed to capture bottom:', error);
      } finally {
        document.body.removeAttribute('data-capturing');
      }
    }
    
    // Reset scroll position
    scrollContainer.scrollTop = originalScroll;
    
    return captures;
  }, [waitForRender]);

  // Capture a single screenshot of an element (for list views)
  const captureSingleView = useCallback(async (
    selector: string,
    label: string,
    type: string
  ): Promise<CapturedScreen[]> => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return [];
    }

    document.body.setAttribute('data-capturing', 'true');
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#121212',
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1600,
        windowHeight: 900,
      });

      return [{
        type,
        label,
        dataUrl: canvas.toDataURL('image/jpeg', 0.7),
        width: canvas.width,
        height: canvas.height,
      }];
    } catch (error) {
      console.error('Failed to capture element:', error);
      return [];
    } finally {
      document.body.removeAttribute('data-capturing');
    }
  }, []);

  // Always captures splash + all editor views (first item per category only)
  const captureAllViews = useCallback(async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    setCaptureProgress(0);
    
    // Temporarily override rest period to allow capturing during rest time
    if (setRestPeriodOverride) {
      setRestPeriodOverride(true);
    }
    
    const captures: CapturedScreen[] = [];
    const toastId = toast.loading('Capturing project state...', { duration: Infinity });
    
    // Calculate total steps dynamically
    const gameData = getGameData?.();
    const restStep = setShowRestPeriod ? 1 : 0;
    
    // Count categories with items (we only capture first item per category now)
    let categoriesWithItems = 0;
    if (gameData) {
      const counts = [
        gameData.actors.length,
        gameData.scenes.length,
        gameData.drops.length,
        gameData.items.length,
        gameData.sfx.length,
        gameData.buttons.length,
        gameData.episodes.length,
        gameData.pages.length,
      ];
      categoriesWithItems = counts.filter(c => c > 0).length;
    }
    
    // Total: 1 splash + 1 settings + (8 categories * 1 list each) + (categories with items * 1 edit each) + rest
    const nonSettingsViews = EDITOR_VIEWS.filter(v => v.type !== 'settings').length;
    const totalSteps = 1 + 1 + nonSettingsViews + categoriesWithItems + restStep;
    let currentStep = 0;
    
    try {
      // ALWAYS capture splash screen first
      // If not on splash, navigate there first
      if (!isOnSplash?.()) {
        navigateToSplash?.();
        await waitForRender(600);
      }
      
      toast.loading('Capturing Index Screen... (0%)', { id: toastId });
      await waitForRender(500);
      
      const splashCapture = await captureElement('[data-capture-area="splash"]');
      if (splashCapture) {
        splashCapture.type = 'splash';
        splashCapture.label = 'Index Screen';
        captures.push(splashCapture);
      }
      currentStep++;
      
      // Navigate to editor for remaining captures
      // Need longer wait for React state to update and editor to render
      navigateToEditor?.();
      await waitForRender(1000);
      
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
            case 'episode': items = gameData.episodes; break;
            case 'page': items = gameData.pages; break;
          }
        }
        
        // For settings, capture top and bottom (it's an editor)
        if (view.type === 'settings') {
          setSelection({ type: view.type, id: null });
          await waitForRender(400);
          
          currentStep++;
          const progress = Math.round((currentStep / totalSteps) * 100);
          setCaptureProgress(progress);
          toast.loading(`Capturing ${view.label}... (${progress}%)`, { id: toastId });
          
          const segmentCaptures = await captureTopAndBottom(
            '[data-capture-area="editor"]',
            view.label,
            view.type
          );
          captures.push(...segmentCaptures);
          continue;
        }
        
        // STEP 1: Capture the LIST view (single screenshot, no scrolling)
        setSelection({ type: view.type, id: null });
        await waitForRender(400);
        
        currentStep++;
        let progress = Math.round((currentStep / totalSteps) * 100);
        setCaptureProgress(progress);
        toast.loading(`Capturing ${view.label} list... (${progress}%)`, { id: toastId });
        
        const listCaptures = await captureSingleView(
          '[data-capture-area="editor"]',
          view.label,
          view.type
        );
        captures.push(...listCaptures);
        
        // STEP 2: If items exist, capture ONLY THE FIRST item's EDIT view
        if (items.length > 0) {
          const item = items[0]; // Only first item
          console.log(`[Capture] Selecting ${view.type} item:`, item.id, item.name);
          setSelection({ type: view.type, id: item.id });
          
          // Much longer wait for edit view - complex editors like Scene/Actor need time to fully render
          await waitForRender(1500);
          
          currentStep++;
          progress = Math.round((currentStep / totalSteps) * 100);
          setCaptureProgress(progress);
          const editLabel = `${view.label.slice(0, -1)}: ${item.name || 'Untitled'}`;
          toast.loading(`Capturing ${editLabel}... (${progress}%)`, { id: toastId });
          
          console.log(`[Capture] About to capture editor for ${view.type}:`, editLabel);
          
          // All editors get top + bottom to capture full content
          const editCaptures = await captureTopAndBottom(
            '[data-capture-area="editor"]',
            editLabel,
            `${view.type}-edit`
          );
          console.log(`[Capture] Got ${editCaptures.length} captures for ${view.type} editor`);
          captures.push(...editCaptures);
        } else {
          console.log(`[Capture] No items for ${view.type}, skipping editor capture`);
        }
      }
      
      // Capture rest period screen (fake it)
      if (setShowRestPeriod) {
        toast.loading('Capturing Rest Period...', { id: toastId });
        setShowRestPeriod(true);
        await waitForRender(500);
        
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
      // Re-enable rest period after capture
      if (setRestPeriodOverride) setRestPeriodOverride(false);
      // Reset selection to settings after capture completes
      setSelection({ type: 'settings', id: null });
    }
  }, [isCapturing, setSelection, captureElement, captureTopAndBottom, captureSingleView, waitForRender, projectTitle, setShowRestPeriod, navigateToEditor, getGameData, navigateToSplash, isOnSplash, setRestPeriodOverride]);

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
    compress: true,
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
    pdf.addImage(capture.dataUrl, 'JPEG', imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');
    pdf.rect(imgX, imgY, imgWidth, imgHeight, 'S');
  }
  
  // Add page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(10);
    pdf.text(`${i} / ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
  }
  
  pdf.save(filename);
}
