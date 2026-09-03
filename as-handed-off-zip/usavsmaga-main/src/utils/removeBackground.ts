/**
 * Removes solid color backgrounds from images by detecting corner colors
 * Works with any solid background color (white, gray, green, etc.)
 */
export const removeBackground = (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Sample corner pixels to detect background color
      const corners = [
        { x: 0, y: 0 },
        { x: canvas.width - 1, y: 0 },
        { x: 0, y: canvas.height - 1 },
        { x: canvas.width - 1, y: canvas.height - 1 }
      ];
      
      let bgR = 0, bgG = 0, bgB = 0;
      for (const corner of corners) {
        const idx = (corner.y * canvas.width + corner.x) * 4;
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      }
      
      bgR = Math.round(bgR / 4);
      bgG = Math.round(bgG / 4);
      bgB = Math.round(bgB / 4);
      
      // Tolerance for background matching - higher for gray/white backgrounds
      const tolerance = 60;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel matches background color within tolerance
        const diffR = Math.abs(r - bgR);
        const diffG = Math.abs(g - bgG);
        const diffB = Math.abs(b - bgB);
        
        if (diffR < tolerance && diffG < tolerance && diffB < tolerance) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for background removal'));
    img.src = imageDataUrl;
  });
};
