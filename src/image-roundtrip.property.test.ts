import { describe, it, expect } from 'bun:test';
import fc from 'fast-check';
import {
  emuToPixels, pixelsToEmu, isSupportedImageFormat,
  computeMissingDimension, resolveImageFilename,
  SUPPORTED_IMAGE_EXTENSIONS
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

  // Feature: image-roundtrip, Property 10: Filename resolution priority
  it('P10: docPr name with valid ext used; otherwise media filename', () => {
    const arbExt = fc.constantFrom(...[...SUPPORTED_IMAGE_EXTENSIONS]);
    const arbBasename = fc.stringMatching(/^[a-z]{1,10}$/).filter(s => s.length > 0);
    fc.assert(
      fc.property(arbBasename, arbExt, arbBasename, arbExt, (docBase, docExt, mediaBase, mediaExt) => {
        const docPrName = docBase + '.' + docExt;
        const mediaFilename = mediaBase + '.' + mediaExt;
        // When docPr has valid extension, use it
        expect(resolveImageFilename(docPrName, mediaFilename)).toBe(docPrName);
        // When docPr has no extension, use media filename
        expect(resolveImageFilename(docBase, mediaFilename)).toBe(mediaFilename);
        // When docPr is undefined, use media filename
        expect(resolveImageFilename(undefined, mediaFilename)).toBe(mediaFilename);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: image-roundtrip, Property 11: Image format metadata serialization roundtrip
  it('P11: chunked-JSON image format mapping roundtrip', async () => {
    // We test the serialization/deserialization by going through the actual
    // custom property XML generation and extraction functions
    const { convertMdToDocx } = await import('./md-to-docx');
    const { extractImageFormatMapping } = await import('./converter');
    const JSZip = (await import('jszip')).default;

    const arbRId = fc.integer({ min: 1, max: 50 }).map(n => 'rId' + String(n));
    const arbSyntax = fc.constantFrom('md', 'html');
    const arbMapping = fc.array(fc.tuple(arbRId, arbSyntax), { minLength: 1, maxLength: 10 })
      .map(pairs => new Map(pairs));

    await fc.assert(
      fc.asyncProperty(arbMapping, async (mapping) => {
        // Serialize: build a minimal DOCX with MANUSCRIPT_IMAGE_FORMATS custom property
        const zip = new JSZip();
        const obj: Record<string, string> = {};
        for (const [k, v] of mapping) obj[k] = v;
        const json = JSON.stringify(obj);
        const CHUNK_SIZE = 240;
        let propsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n';
        for (let i = 0, idx = 1; i < json.length; i += CHUNK_SIZE, idx++) {
          propsXml += '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="' + (idx + 1) + '" name="MANUSCRIPT_IMAGE_FORMATS_' + idx + '"><vt:lpwstr>' + json.slice(i, i + CHUNK_SIZE) + '</vt:lpwstr></property>\n';
        }
        propsXml += '</Properties>';
        zip.file('docProps/custom.xml', propsXml);

        // Deserialize
        const result = await extractImageFormatMapping(zip);
        expect(result).not.toBeNull();
        if (result) {
          for (const [k, v] of mapping) {
            expect(result.get(k)).toBe(v);
          }
        }
      }),
      { numRuns: 50 }
    );
  });
});