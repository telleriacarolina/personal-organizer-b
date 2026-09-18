const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP_WEBP = [0x57, 0x45, 0x42, 0x50];

const IMAGE_MIME_ALLOWLIST = new Set(['image/jpeg', 'image/png', 'image/webp']);

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

async function hasAllowedImageSignature(file: File): Promise<boolean> {
  const sample = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (startsWith(sample, JPEG_SIGNATURE)) return true;
  if (startsWith(sample, PNG_SIGNATURE)) return true;
  const webpMatch = startsWith(sample, WEBP_RIFF) && WEBP_WEBP.every((v, i) => sample[i + 8] === v);
  return webpMatch;
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode image'));
    };
    img.src = url;
  });
}

function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type || 'image/jpeg', lastModified: Date.now() });
}

export type ValidatedImageFile = {
  file: File;
  width: number;
  height: number;
};

export async function validateImageFile(
  file: File,
  options: {
    maxBytes: number;
    maxWidth: number;
    maxHeight: number;
  }
): Promise<ValidatedImageFile> {
  if (!IMAGE_MIME_ALLOWLIST.has(file.type)) {
    throw new Error('Only JPEG, PNG, and WEBP images are supported');
  }
  if (file.size > options.maxBytes) {
    throw new Error(`Image is too large (max ${(options.maxBytes / (1024 * 1024)).toFixed(0)}MB)`);
  }
  if (!(await hasAllowedImageSignature(file))) {
    throw new Error('Unsupported or malformed image file');
  }

  const { width, height } = await loadImageDimensions(file);
  if (width <= 0 || height <= 0) {
    throw new Error('Malformed image dimensions');
  }
  if (width > options.maxWidth || height > options.maxHeight) {
    throw new Error(`Image dimensions exceed ${options.maxWidth}x${options.maxHeight}`);
  }
  return { file, width, height };
}

export async function normalizeImageForStorage(
  file: File,
  options: {
    maxWidth: number;
    maxHeight: number;
    quality?: number;
  }
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, options.maxWidth / bitmap.width, options.maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const normalizedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to process image'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', options.quality ?? 0.88);
    });
    return blobToFile(normalizedBlob, file.name.replace(/\.[^.]+$/, '') + '.jpg');
  } finally {
    bitmap.close();
  }
}

export function assertMaxBytes(blob: Blob, maxBytes: number, label: string): void {
  if (blob.size > maxBytes) {
    throw new Error(`${label} exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit`);
  }
}
