/**
 * Biometric Face Photo Normalization & Utility
 * Enforces HikCentral JPEG requirements:
 * - JPEG format strictly
 * - Size strictly between 10 KB (10,240 bytes) and 100 KB (102,400 bytes)
 * - Raw Base64 string for wire payloads (stripping data:image/...;base64,)
 * - Formatted Data URI for <img> components
 */

export const MIN_FACE_PHOTO_BYTES = 10 * 1024; // 10,240 bytes (10 KB)
export const MAX_FACE_PHOTO_BYTES = 100 * 1024; // 102,400 bytes (100 KB)
export const DEFAULT_TARGET_PAD_BYTES = 16 * 1024; // 16,384 bytes (~16 KB)

export interface NormalizedFaceResult {
  base64: string;
  dataUri: string;
  byteSize: number;
  isValidSize: boolean;
}

export interface NormalizeFaceOptions {
  targetMinBytes?: number;
  targetMaxBytes?: number;
}

/**
 * Strips data URI scheme prefixes (e.g. "data:image/jpeg;base64,")
 * to produce clean raw Base64 string for HikCentral wire payloads.
 */
export function stripDataUriPrefix(input: string): string {
  const trimmed = input.trim();
  return trimmed.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, "");
}

/**
 * Ensures a Base64 string has the valid "data:image/jpeg;base64," prefix
 * for rendering in browser <img> or Next.js Image components.
 */
export function toJpegDataUri(input: string): string {
  const clean = stripDataUriPrefix(input);
  return `data:image/jpeg;base64,${clean}`;
}

/**
 * Ensures a Base64 string has the valid "data:image/png;base64," prefix
 * for rendering QR code images in browser <img> or Next.js Image components.
 */
export function toPngDataUri(input: string): string {
  const clean = stripDataUriPrefix(input);
  return `data:image/png;base64,${clean}`;
}

/**
 * Validates whether byte size is strictly within the 10 KB to 100 KB window.
 */
export function isFacePhotoSizeValid(bytes: number): boolean {
  return bytes >= MIN_FACE_PHOTO_BYTES && bytes <= MAX_FACE_PHOTO_BYTES;
}

/**
 * Formats a byte number to human-readable KB format (e.g. "24.5 KB").
 */
export function formatFacePhotoSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Computes exact binary byte length of a Base64 string.
 */
export function getBase64ByteSize(base64: string): number {
  const clean = stripDataUriPrefix(base64).replace(/\s+/g, "");
  if (!clean) return 0;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

/**
 * Converts a Uint8Array to a Base64 string isomorphically.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to a Uint8Array isomorphically.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = stripDataUriPrefix(base64).replace(/\s+/g, "");
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(clean, "base64"));
  }
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a compliant sample face photo JPEG Data URI (~24.5 KB)
 * for testing and demonstration.
 */
export function createSampleFaceJpegDataUri(sizeBytes = 25088): string {
  const header = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
  ]);
  const footer = new Uint8Array([0xff, 0xd9]);
  const middleLen = Math.max(0, sizeBytes - header.length - footer.length);
  const middle = new Uint8Array(middleLen);
  // Fill middle with subtle pattern
  for (let i = 0; i < middleLen; i++) {
    middle[i] = (i % 251);
  }

  const combined = new Uint8Array(sizeBytes);
  combined.set(header, 0);
  combined.set(middle, header.length);
  combined.set(footer, header.length + middle.length);

  return `data:image/jpeg;base64,${uint8ArrayToBase64(combined)}`;
}

/**
 * Pads a valid JPEG buffer with a standard JPEG COM (comment) marker (0xFF, 0xFE)
 * so that its total byte size safely reaches the required minimum without altering
 * image decoding or pixel data.
 */
function padJpegWithComment(jpegBytes: Uint8Array, targetBytes: number): Uint8Array {
  const currentLen = jpegBytes.length;
  if (currentLen >= targetBytes) {
    return jpegBytes;
  }

  const neededBytes = targetBytes - currentLen;
  const comPayloadLen = Math.max(0, neededBytes - 4);
  const totalComLen = comPayloadLen + 2;

  if (totalComLen > 65535) {
    const chunkPayloadLen = 65533;
    const chunk = new Uint8Array(chunkPayloadLen + 4);
    chunk[0] = 0xff;
    chunk[1] = 0xfe;
    chunk[2] = 0xff;
    chunk[3] = 0xff;
    const prefix = jpegBytes.subarray(0, jpegBytes.length - 2);
    const suffix = jpegBytes.subarray(jpegBytes.length - 2);
    const next = new Uint8Array(prefix.length + chunk.length + suffix.length);
    next.set(prefix, 0);
    next.set(chunk, prefix.length);
    next.set(suffix, prefix.length + chunk.length);
    return padJpegWithComment(next, targetBytes);
  }

  const comSegment = new Uint8Array(totalComLen + 2);
  comSegment[0] = 0xff;
  comSegment[1] = 0xfe;
  comSegment[2] = (totalComLen >> 8) & 0xff;
  comSegment[3] = totalComLen & 0xff;

  const eoiIndex = jpegBytes.length - 2;
  const prefix = jpegBytes.subarray(0, eoiIndex);
  const suffix = jpegBytes.subarray(eoiIndex);
  const padded = new Uint8Array(prefix.length + comSegment.length + suffix.length);
  padded.set(prefix, 0);
  padded.set(comSegment, prefix.length);
  padded.set(suffix, prefix.length + comSegment.length);
  return padded;
}

/**
 * Normalizes an image (Base64 string, data URI, or Buffer) to ensure it satisfies:
 * 1. Valid JPEG structure (starts with 0xFF 0xD8 and ends with 0xFF 0xD9)
 * 2. Byte size strictly between 10 KB (10,240 bytes) and 100 KB (102,400 bytes)
 * Returns normalized clean Base64 string and data URI.
 */
export async function normalizeFaceImage(
  input: string | Uint8Array,
  options: NormalizeFaceOptions = {},
): Promise<NormalizedFaceResult> {
  const minBytes = options.targetMinBytes ?? MIN_FACE_PHOTO_BYTES;
  const maxBytes = options.targetMaxBytes ?? MAX_FACE_PHOTO_BYTES;

  let bytes: Uint8Array;
  if (typeof input === "string") {
    const cleanBase64 = stripDataUriPrefix(input);
    if (!cleanBase64) {
      throw new Error("Invalid image: input string is empty.");
    }
    bytes = base64ToUint8Array(cleanBase64);
  } else {
    bytes = input;
  }

  if (bytes.length < 4) {
    throw new Error("Invalid image: payload too small to be a valid image.");
  }

  // Validate JPEG SOI marker (0xFF, 0xD8)
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (!isJpeg) {
    throw new Error(
      "Invalid image: only JPEG format is supported for HikCentral biometric face verification.",
    );
  }

  // Validate JPEG EOI marker (0xFF, 0xD9)
  const hasEoi =
    bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (!hasEoi) {
    throw new Error("Invalid image: corrupted JPEG stream missing EOI marker.");
  }

  // Check if buffer exceeds max allowed bytes
  if (bytes.length > maxBytes) {
    throw new Error(
      `Image size (${formatFacePhotoSize(bytes.length)}) exceeds maximum allowed size (${formatFacePhotoSize(maxBytes)}).`,
    );
  }

  // If buffer is below minBytes, pad with standard JPEG comment segment
  if (bytes.length < minBytes) {
    const target = Math.min(
      maxBytes,
      Math.max(minBytes, DEFAULT_TARGET_PAD_BYTES),
    );
    bytes = padJpegWithComment(bytes, target);
  }

  const byteSize = bytes.length;
  const isValid = isFacePhotoSizeValid(byteSize);
  const base64 = uint8ArrayToBase64(bytes);
  const dataUri = `data:image/jpeg;base64,${base64}`;

  return {
    base64,
    dataUri,
    byteSize,
    isValidSize: isValid,
  };
}

/**
 * Browser-side canvas image processor that downsamples/crops and compresses
 * raw file uploads or webcam snapshots to a compliant JPEG Base64.
 */
export async function processBrowserImageFile(
  file: File | Blob | string,
  maxDimension = 640,
): Promise<NormalizedFaceResult> {
  if (typeof window === "undefined") {
    // If in SSR or Node test, delegate directly to normalizeFaceImage
    if (typeof file === "string") {
      return normalizeFaceImage(file);
    }
    const arrayBuffer = await file.arrayBuffer();
    return normalizeFaceImage(new Uint8Array(arrayBuffer));
  }

  // Browser Canvas pipeline
  return new Promise((resolve, reject) => {
    let sourceUri: string;
    if (typeof file === "string") {
      sourceUri = file;
    } else {
      sourceUri = URL.createObjectURL(file);
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      if (typeof file !== "string") {
        URL.revokeObjectURL(sourceUri);
      }

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Unable to create canvas 2D rendering context.");
        }

        // Draw image onto canvas
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively test quality from 0.85 down to 0.4 if needed
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        let byteLen = getBase64ByteSize(dataUrl);

        while (byteLen > MAX_FACE_PHOTO_BYTES && quality > 0.3) {
          quality -= 0.15;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
          byteLen = getBase64ByteSize(dataUrl);
        }

        const normalized = await normalizeFaceImage(dataUrl);
        resolve(normalized);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      if (typeof file !== "string") {
        URL.revokeObjectURL(sourceUri);
      }
      reject(new Error("Failed to load image for processing."));
    };

    img.src = sourceUri;
  });
}
