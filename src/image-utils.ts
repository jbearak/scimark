// Image utility functions for image-roundtrip feature

export const EMU_PER_PIXEL = 9525;

export const SUPPORTED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg']);

export const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml'
};

export function emuToPixels(emu: number): number {
  return Math.round(emu / EMU_PER_PIXEL);
}

export function pixelsToEmu(px: number): number {
  return px * EMU_PER_PIXEL;
}

export function isSupportedImageFormat(ext: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(ext.toLowerCase());
}

export function getImageContentType(ext: string): string | undefined {
  return IMAGE_CONTENT_TYPES[ext.toLowerCase()];
}

export function readImageDimensions(data: Uint8Array, format: string): { width: number; height: number } | null {
  const fmt = format.toLowerCase();
  
  if (fmt === 'png') {
    if (data.length < 24) return null;
    const width = ((data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19]) >>> 0;
    const height = ((data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23]) >>> 0;
    return { width, height };
  }
  
  if (fmt === 'jpeg' || fmt === 'jpg') {
    // Walk JPEG markers properly, skipping each marker's payload by reading
    // its 2-byte length, to avoid matching SOF inside EXIF thumbnail data.
    let i = 0;
    while (i < data.length - 1) {
      if (data[i] !== 0xFF) { i++; continue; }
      const marker = data[i + 1];
      // SOF0 or SOF2 — read dimensions
      if (marker === 0xC0 || marker === 0xC2) {
        if (i + 8 < data.length) {
          const height = (data[i + 5] << 8) | data[i + 6];
          const width = (data[i + 7] << 8) | data[i + 8];
          return { width, height };
        }
        return null;
      }
      // Markers without a payload: SOI (D8), EOI (D9), RST0-RST7 (D0-D7), TEM (01), stuffed byte (00)
      if (marker === 0xD8 || marker === 0xD9 || marker === 0x00 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
        i += 2;
        continue;
      }
      // All other markers: read 2-byte big-endian length and skip payload
      if (i + 3 < data.length) {
        const len = (data[i + 2] << 8) | data[i + 3];
        i += 2 + len;
      } else {
        break;
      }
    }
    return null;
  }
  
  if (fmt === 'gif') {
    if (data.length < 10) return null;
    const width = data[6] | (data[7] << 8);
    const height = data[8] | (data[9] << 8);
    return { width, height };
  }
  
  if (fmt === 'svg') {
    const text = new TextDecoder().decode(data);
    const svgMatch = text.match(/<svg[^>]*>/);
    if (!svgMatch) return null;
    
    const svgTag = svgMatch[0];
    const widthMatch = svgTag.match(/width\s*=\s*["']([^"']+)["']/);
    const heightMatch = svgTag.match(/height\s*=\s*["']([^"']+)["']/);
    
    if (widthMatch && heightMatch) {
      const width = parseUnit(widthMatch[1]);
      const height = parseUnit(heightMatch[1]);
      if (width && height) return { width, height };
    }
    
    const viewBoxMatch = svgTag.match(/viewBox\s*=\s*["']([^"']+)["']/);
    if (viewBoxMatch) {
      const values = viewBoxMatch[1].split(/\s+/).map(Number);
      if (values.length === 4 && values[2] > 0 && values[3] > 0 && !isNaN(values[2]) && !isNaN(values[3])) {
        return { width: values[2], height: values[3] };
      }
    }
    
    return null;
  }
  
  return null;
}

function parseUnit(value: string): number | null {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  
  if (value.endsWith('mm')) return num * 96 / 25.4;
  if (value.endsWith('cm')) return num * 96 / 2.54;
  if (value.endsWith('in')) return num * 96;
  if (value.endsWith('pt')) return num * 96 / 72;
  
  return num;
}

export function computeMissingDimension(
  explicit: { width?: number; height?: number },
  intrinsic: { width: number; height: number }
): { width: number; height: number } {
  if (explicit.width && explicit.height) {
    return { width: explicit.width, height: explicit.height };
  }
  
  if (explicit.width && intrinsic.width > 0) {
    const height = Math.round(explicit.width * intrinsic.height / intrinsic.width);
    return { width: explicit.width, height };
  }

  if (explicit.height && intrinsic.height > 0) {
    const width = Math.round(explicit.height * intrinsic.width / intrinsic.height);
    return { width, height: explicit.height };
  }
  
  return intrinsic;
}

export function resolveImageFilename(docPrName: string | undefined, mediaFilename: string): string {
  if (!docPrName) return mediaFilename;
  
  const ext = docPrName.split('.').pop()?.toLowerCase();
  if (ext && isSupportedImageFormat(ext)) {
    return docPrName;
  }
  
  return mediaFilename;
}

export const IMAGE_WARNINGS = {
  notFound: (path: string): string => 'Image not found: ' + path,
  unsupportedFormat: (ext: string, path: string): string => 'Unsupported image format (' + ext + ') for: ' + path,
  readError: (path: string, error: string): string => 'Error reading dimensions for ' + path + ': ' + error,
  missingMedia: (rId: string, target: string): string => 'Relationship ' + rId + ' points to missing media: ' + target,
  defaultDimensions: (path: string): string => 'Could not read dimensions for ' + path + '; using default (100x100)'
};
