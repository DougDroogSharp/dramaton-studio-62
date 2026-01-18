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
  if (isFileSystemAccessSupported()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: options.suggestedName,
        types: options.types,
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
      console.error('File save error:', err);
      // Fall through to legacy method
    }
  }
  
  // Fallback for older browsers
  const blob = new Blob([content], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = options.suggestedName || 'file.json';
  a.click();
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
    
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      const content = await file.text();
      resolve({ content, name: file.name });
    };
    
    // Handle cancel (no reliable event, so we use blur detection)
    input.oncancel = () => resolve(null);
    
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
