import { describe, it, expect } from "vitest";
import {
  stripDataUriPrefix,
  toJpegDataUri,
  toPngDataUri,
  isFacePhotoSizeValid,
  formatFacePhotoSize,
  getBase64ByteSize,
  normalizeFaceImage,
  MIN_FACE_PHOTO_BYTES,
  MAX_FACE_PHOTO_BYTES,
} from "./face-normalizer";

// Minimal valid 1x1 JPEG buffer fixture
function createMinimalJpeg(sizeBytes = 200): Buffer {
  // JPEG SOI (FF D8) + APP0 marker + SOS + EOI (FF D9)
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
  ]);
  const footer = Buffer.from([0xff, 0xd9]);
  const middleLen = Math.max(0, sizeBytes - header.length - footer.length);
  const middle = Buffer.alloc(middleLen, 0x00);
  return Buffer.concat([header, middle, footer]);
}

describe("Face Normalizer Utility", () => {
  describe("stripDataUriPrefix", () => {
    it("strips data:image/jpeg;base64, prefix", () => {
      const raw = "abc123xyz==";
      const dataUri = `data:image/jpeg;base64,${raw}`;
      expect(stripDataUriPrefix(dataUri)).toBe(raw);
    });

    it("strips data:image/png;base64, prefix", () => {
      const raw = "iVBORw0KGgoAAAANSUhEUg==";
      const dataUri = `data:image/png;base64,${raw}`;
      expect(stripDataUriPrefix(dataUri)).toBe(raw);
    });

    it("returns raw base64 unchanged if no prefix present", () => {
      const raw = "/9j/4AAQSkZJRg==";
      expect(stripDataUriPrefix(raw)).toBe(raw);
    });

    it("trims surrounding whitespace", () => {
      const raw = "abc123xyz==";
      expect(stripDataUriPrefix(`  data:image/jpeg;base64,${raw}  \n`)).toBe(
        raw,
      );
    });
  });

  describe("toJpegDataUri", () => {
    it("prepends data:image/jpeg;base64, to raw base64 string", () => {
      const raw = "/9j/4AAQSkZJRg==";
      expect(toJpegDataUri(raw)).toBe(`data:image/jpeg;base64,${raw}`);
    });

    it("keeps existing data:image/jpeg;base64, prefix", () => {
      const uri = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      expect(toJpegDataUri(uri)).toBe(uri);
    });

    it("replaces other mime data URIs with image/jpeg", () => {
      const raw = "iVBORw0KGgoAAA==";
      const pngUri = `data:image/png;base64,${raw}`;
      expect(toJpegDataUri(pngUri)).toBe(`data:image/jpeg;base64,${raw}`);
    });
  });

  describe("toPngDataUri", () => {
    it("prepends data:image/png;base64, to raw base64 string", () => {
      const raw = "iVBORw0KGgoAAA==";
      expect(toPngDataUri(raw)).toBe(`data:image/png;base64,${raw}`);
    });

    it("preserves base64 payload when stripping jpeg prefix and applying png prefix", () => {
      const raw = "iVBORw0KGgoAAA==";
      const jpegUri = `data:image/jpeg;base64,${raw}`;
      expect(toPngDataUri(jpegUri)).toBe(`data:image/png;base64,${raw}`);
    });
  });

  describe("isFacePhotoSizeValid", () => {
    it("returns false for less than 10 KB (10,240 bytes)", () => {
      expect(isFacePhotoSizeValid(MIN_FACE_PHOTO_BYTES - 1)).toBe(false);
      expect(isFacePhotoSizeValid(0)).toBe(false);
    });

    it("returns true for exactly 10 KB (10,240 bytes)", () => {
      expect(isFacePhotoSizeValid(MIN_FACE_PHOTO_BYTES)).toBe(true);
    });

    it("returns true for 50 KB", () => {
      expect(isFacePhotoSizeValid(51200)).toBe(true);
    });

    it("returns true for exactly 100 KB (102,400 bytes)", () => {
      expect(isFacePhotoSizeValid(MAX_FACE_PHOTO_BYTES)).toBe(true);
    });

    it("returns false for greater than 100 KB (102,400 bytes)", () => {
      expect(isFacePhotoSizeValid(MAX_FACE_PHOTO_BYTES + 1)).toBe(false);
    });
  });

  describe("formatFacePhotoSize", () => {
    it("formats byte values into human-readable KB format", () => {
      expect(formatFacePhotoSize(10240)).toBe("10.0 KB");
      expect(formatFacePhotoSize(25088)).toBe("24.5 KB");
      expect(formatFacePhotoSize(102400)).toBe("100.0 KB");
    });
  });

  describe("getBase64ByteSize", () => {
    it("computes accurate binary byte length from base64 string", () => {
      const testBuffer = Buffer.from("Hello Antigravity VMS Biometric System");
      const base64 = testBuffer.toString("base64");
      expect(getBase64ByteSize(base64)).toBe(testBuffer.length);
    });
  });

  describe("normalizeFaceImage", () => {
    it("pads a small JPEG (< 10 KB) so it is strictly between 10 KB and 100 KB", async () => {
      const smallJpeg = createMinimalJpeg(1000);
      const base64Input = smallJpeg.toString("base64");

      const result = await normalizeFaceImage(base64Input);
      expect(result.byteSize).toBeGreaterThanOrEqual(MIN_FACE_PHOTO_BYTES);
      expect(result.byteSize).toBeLessThanOrEqual(MAX_FACE_PHOTO_BYTES);
      expect(result.isValidSize).toBe(true);
      expect(result.base64.startsWith("data:")).toBe(false);
      expect(result.dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);

      // Verify JPEG header and footer markers are preserved
      const outBuffer = Buffer.from(result.base64, "base64");
      expect(outBuffer[0]).toBe(0xff);
      expect(outBuffer[1]).toBe(0xd8); // SOI
      expect(outBuffer[outBuffer.length - 2]).toBe(0xff);
      expect(outBuffer[outBuffer.length - 1]).toBe(0xd9); // EOI
    });

    it("accepts a data URI string input and produces normalized output", async () => {
      const smallJpeg = createMinimalJpeg(500);
      const dataUriInput = `data:image/jpeg;base64,${smallJpeg.toString("base64")}`;

      const result = await normalizeFaceImage(dataUriInput);
      expect(result.isValidSize).toBe(true);
      expect(result.byteSize).toBeGreaterThanOrEqual(10240);
      expect(result.byteSize).toBeLessThanOrEqual(102400);
    });

    it("preserves an existing JPEG that is already between 10 KB and 100 KB", async () => {
      const compliantJpeg = createMinimalJpeg(30000);
      const result = await normalizeFaceImage(compliantJpeg);
      expect(result.byteSize).toBe(30000);
      expect(result.isValidSize).toBe(true);
    });

    it("rejects invalid non-image payload", async () => {
      await expect(normalizeFaceImage("not-a-valid-base64-image")).rejects.toThrow(
        /Invalid image/,
      );
    });

    it("rejects image exceeding 100 KB if it cannot be compressed below 100 KB", async () => {
      const hugeBuffer = createMinimalJpeg(150000); // 150 KB
      await expect(normalizeFaceImage(hugeBuffer)).rejects.toThrow(
        /exceeds maximum allowed size/i,
      );
    });
  });
});
