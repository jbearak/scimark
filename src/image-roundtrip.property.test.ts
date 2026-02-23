import { describe, it, expect } from 'bun:test';
import fc from 'fast-check';
import {
  emuToPixels, pixelsToEmu, isSupportedImageFormat,
  computeMissingDimension
} from './image-utils';

describe('image-roundtrip properties', () => {
  // Feature: image-roundtrip, Property 1: EMU↔pixel conversion roundtrip
  it('P1: emuToPixels(pixelsToEmu(px)) === px for any positive integer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (px) => {
          expect(emuToPixels(pixelsToEmu(px))).toBe(px);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: image-roundtrip, Property 9: Supported format filtering
  it('P9: supported formats accepted, unsupported rejected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('png', 'jpg', 'jpeg', 'gif', 'svg'),
        (ext) => {
          expect(isSupportedImageFormat(ext)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
    fc.assert(
      fc.property(
        fc.constantFrom('bmp', 'tiff', 'webp', 'emf', 'wmf'),
        (ext) => {
          expect(isSupportedImageFormat(ext)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: image-roundtrip, Property 6: Aspect ratio preservation
  it('P6: single-dimension spec preserves aspect ratio within ±1px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        (intrW, intrH, explicitDim) => {
          // Width-only
          const wOnly = computeMissingDimension({ width: explicitDim }, { width: intrW, height: intrH });
          const expectedH = Math.round(explicitDim * intrH / intrW);
          expect(Math.abs(wOnly.height - expectedH)).toBeLessThanOrEqual(1);
          expect(wOnly.width).toBe(explicitDim);

          // Height-only
          const hOnly = computeMissingDimension({ height: explicitDim }, { width: intrW, height: intrH });
          const expectedW = Math.round(explicitDim * intrW / intrH);
          expect(Math.abs(hOnly.width - expectedW)).toBeLessThanOrEqual(1);
          expect(hOnly.height).toBe(explicitDim);
        }
      ),
      { numRuns: 100 }
    );
  });
});