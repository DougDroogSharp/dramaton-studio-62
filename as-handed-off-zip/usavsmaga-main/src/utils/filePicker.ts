// File System Access API utilities with fallbacks for older browsers

interface FilePickerOptions {
  suggestedName?: string;
  types?: {
    description: string;
    accept: Record<string, string[]>;
  }[];
}

// Check if File System Access API is supported
export const isFileSystemAccessSupported = (): boolean => {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
};

// Save file with native picker (with fallback)
export const saveFileWithPicker = async (
  content: string,
  options: FilePickerOptions
): Promise<boolean> => {
  // Try modern File System Access API first
  if (isFileSystemAccessSupported()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: options.suggestedName,
        types: options.types,
        startIn: 'documents', // Start in documents folder
      });
      
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err: any) {
      // User cancelled the picker
      if (err.name === 'AbortError') {
        return false;
      }
      // SecurityError can happen in iframes or cross-origin contexts
      if (err.name === 'SecurityError') {
        console.warn('File System Access API blocked, using fallback');
      } else {
        console.error('File save error:', err);
      }
      // Fall through to legacy method
    }
  }
  
  // Fallback for older browsers or when API is blocked
  const blob = new Blob([content], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = options.suggestedName || 'file.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  return true;
};

// Open file with native picker (with fallback)
export const openFileWithPicker = async (
  options: FilePickerOptions
): Promise<{ content: string; name: string } | null> => {
  if (isFileSystemAccessSupported()) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: options.types,
        multiple: false,
      });
      
      const file = await handle.getFile();
      const content = await file.text();
      return { content, name: file.name };
    } catch (err: any) {
      // User cancelled the picker
      if (err.name === 'AbortError') {
        return null;
      }
      console.error('File open error:', err);
      // Fall through to legacy method
    }
  }
  
  // Fallback: Use hidden file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.types
      ?.flatMap(t => Object.values(t.accept).flat())
      .join(',') || '*';
    
    let resolved = false;
    
    const cleanup = () => {
      if (input.parentNode) {
        document.body.removeChild(input);
      }
    };
    
    const resolveWith = (result: { content: string; name: string } | null) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };
    
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolveWith(null);
        return;
      }
      
      try {
        const content = await file.text();
        resolveWith({ content, name: file.name });
      } catch (err) {
        console.error('Error reading file:', err);
        resolveWith(null);
      }
    };
    
    // Use the cancel event for detecting when user cancels (supported in modern browsers)
    input.oncancel = () => {
      resolveWith(null);
    };
    
    // Append to body to ensure it works in all contexts
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
  });
};

// DRAM file options
export const DRAM_FILE_OPTIONS: FilePickerOptions = {
  types: [{
    description: 'Dramaton Game Files',
    accept: {
      'application/json': ['.dram', '.json'],
    },
  }],
};

// Library file options
export const LIBRARY_FILE_OPTIONS: FilePickerOptions = {
  types: [{
    description: 'Dramaton Library Files',
    accept: {
      'application/json': ['.dramlib', '.json'],
    },
  }],
};
