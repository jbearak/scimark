import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Toolbar Configuration Property-Based Tests', () => {
  
  // Helper to load package.json
  const loadPackageJson = () => {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  };

  // Helper to get CriticMarkup-related toolbar entries
  const getCriticMarkupToolbarEntries = (packageJson: any) => {
    const editorTitleMenu = packageJson.contributes?.menus?.['editor/title'] || [];
    
    return editorTitleMenu.filter((entry: any) => {
      // Check if it's a CriticMarkup command
      if (entry.command && entry.command.startsWith('criticmarkup.')) {
        return true;
      }
      // Check if it's a markdown submenu (annotations or formatting)
      if (entry.submenu && (
        entry.submenu === 'markdown.annotations' || 
        entry.submenu === 'markdown.formatting'
      )) {
        return true;
      }
      return false;
    });
  };

  /**
   * Feature: editor-toolbar-buttons, Property 1: Toolbar button visibility configuration
   * Validates: Requirements 1.1, 1.3, 1.4, 2.1, 2.3, 2.4
   * 
   * For any toolbar button entry in the editor/title menu, the when clause should be
   * editorLangId == markdown && !isInDiffEditor to ensure buttons appear only in
   * markdown files outside diff editor mode.
   */
  describe('Property 1: Toolbar button visibility configuration', () => {
    it('should validate when clause for all CriticMarkup toolbar entries', () => {
      fc.assert(
        fc.property(
          fc.constant(loadPackageJson()),
          (packageJson) => {
            const toolbarEntries = getCriticMarkupToolbarEntries(packageJson);
            
            // Verify we found the expected entries
            expect(toolbarEntries.length).toBeGreaterThan(0);
            
            // Check each entry has the correct when clause
            for (const entry of toolbarEntries) {
              expect(entry.when).toBeDefined();
              expect(entry.when).toBe('editorLangId == markdown && !isInDiffEditor');
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify all four expected toolbar entries exist with correct when clauses', () => {
      const packageJson = loadPackageJson();
      const toolbarEntries = getCriticMarkupToolbarEntries(packageJson);
      
      // Should have exactly 4 entries: 2 submenus + 2 commands
      expect(toolbarEntries.length).toBe(4);
      
      // Find each expected entry
      const formattingSubmenu = toolbarEntries.find((e: any) => e.submenu === 'markdown.formatting');
      const annotationsSubmenu = toolbarEntries.find((e: any) => e.submenu === 'markdown.annotations');
      const prevChangeCommand = toolbarEntries.find((e: any) => e.command === 'criticmarkup.prevChange');
      const nextChangeCommand = toolbarEntries.find((e: any) => e.command === 'criticmarkup.nextChange');
      
      expect(formattingSubmenu).toBeDefined();
      expect(annotationsSubmenu).toBeDefined();
      expect(prevChangeCommand).toBeDefined();
      expect(nextChangeCommand).toBeDefined();
      
      // Verify when clauses
      const expectedWhen = 'editorLangId == markdown && !isInDiffEditor';
      expect(formattingSubmenu.when).toBe(expectedWhen);
      expect(annotationsSubmenu.when).toBe(expectedWhen);
      expect(prevChangeCommand.when).toBe(expectedWhen);
      expect(nextChangeCommand.when).toBe(expectedWhen);
    });
  });

  /**
   * Feature: editor-toolbar-buttons, Property 2: Button grouping and ordering
   * Validates: Requirements 3.1, 3.2
   * 
   * For all four CriticMarkup toolbar buttons (formatting submenu, annotations submenu,
   * prevChange, nextChange), they should be in the navigation group and ordered as:
   * formatting (@1), annotations (@2), prevChange (@3), nextChange (@4)
   */
  describe('Property 2: Button grouping and ordering', () => {
    it('should validate navigation group and ordering for all CriticMarkup toolbar entries', () => {
      fc.assert(
        fc.property(
          fc.constant(loadPackageJson()),
          (packageJson) => {
            const toolbarEntries = getCriticMarkupToolbarEntries(packageJson);
            
            // Verify all entries are in navigation group
            for (const entry of toolbarEntries) {
              expect(entry.group).toBeDefined();
              expect(entry.group).toMatch(/^navigation@\d+$/);
            }
            
            // Verify specific ordering
            const formattingSubmenu = toolbarEntries.find((e: any) => e.submenu === 'markdown.formatting');
            const annotationsSubmenu = toolbarEntries.find((e: any) => e.submenu === 'markdown.annotations');
            const prevChangeCommand = toolbarEntries.find((e: any) => e.command === 'criticmarkup.prevChange');
            const nextChangeCommand = toolbarEntries.find((e: any) => e.command === 'criticmarkup.nextChange');
            
            expect(formattingSubmenu?.group).toBe('navigation@1');
            expect(annotationsSubmenu?.group).toBe('navigation@2');
            expect(prevChangeCommand?.group).toBe('navigation@3');
            expect(nextChangeCommand?.group).toBe('navigation@4');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify buttons appear in correct order in the array', () => {
      const packageJson = loadPackageJson();
      const editorTitleMenu = packageJson.contributes?.menus?.['editor/title'] || [];
      
      // Find indices of our four entries
      const formattingIndex = editorTitleMenu.findIndex((e: any) => e.submenu === 'markdown.formatting');
      const annotationsIndex = editorTitleMenu.findIndex((e: any) => e.submenu === 'markdown.annotations');
      const prevChangeIndex = editorTitleMenu.findIndex((e: any) => e.command === 'criticmarkup.prevChange');
      const nextChangeIndex = editorTitleMenu.findIndex((e: any) => e.command === 'criticmarkup.nextChange');
      
      // All should be found
      expect(formattingIndex).toBeGreaterThanOrEqual(0);
      expect(annotationsIndex).toBeGreaterThanOrEqual(0);
      expect(prevChangeIndex).toBeGreaterThanOrEqual(0);
      expect(nextChangeIndex).toBeGreaterThanOrEqual(0);
      
      // Verify they appear in order (array order should match logical order)
      expect(formattingIndex).toBeLessThan(annotationsIndex);
      expect(annotationsIndex).toBeLessThan(prevChangeIndex);
      expect(prevChangeIndex).toBeLessThan(nextChangeIndex);
    });

    it('should verify all four buttons are in the same navigation group', () => {
      fc.assert(
        fc.property(
          fc.constant(loadPackageJson()),
          (packageJson) => {
            const toolbarEntries = getCriticMarkupToolbarEntries(packageJson);
            
            // Extract group names (without @suffix)
            const groups = toolbarEntries.map((e: any) => {
              const match = e.group?.match(/^([^@]+)/);
              return match ? match[1] : null;
            });
            
            // All should be in 'navigation' group
            for (const group of groups) {
              expect(group).toBe('navigation');
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
