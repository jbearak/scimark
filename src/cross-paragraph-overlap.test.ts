import { describe, test, expect } from 'bun:test';
import { buildMarkdown } from './converter';
import type { ContentItem, Comment } from './converter';

describe('Cross-paragraph comment overlap bug fix', () => {
  test('should emit comment body only once when comment spans multiple paragraphs with varying overlap', () => {
    // Comment A spans paragraphs 1-2, Comment B only in paragraph 2 (overlapping with A)
    const content: ContentItem[] = [
      { type: 'para' },
      { type: 'text', text: 'text in para 1', commentIds: new Set(['commentA']), formatting: {} },
      { type: 'para' },
      { type: 'text', text: 'text A ', commentIds: new Set(['commentA']), formatting: {} },
      { type: 'text', text: 'text B', commentIds: new Set(['commentA', 'commentB']), formatting: {} },
      { type: 'text', text: ' more A', commentIds: new Set(['commentA']), formatting: {} },
    ];

    const comments = new Map<string, Comment>([
      ['commentA', { author: 'alice', text: 'note A', date: '2024-01-01T12:00:00Z' }],
      ['commentB', { author: 'bob', text: 'note B', date: '2024-01-01T12:00:00Z' }],
    ]);

    const markdown = buildMarkdown(content, comments);

    // Count occurrences of comment A's body
    const commentABodyPattern = /\{#?\d*>>alice.*?note A.*?<<\}/g;
    const matches = markdown.match(commentABodyPattern);

    // Should appear exactly once (not twice)
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);

    // Both paragraphs should use ID syntax consistently
    expect(markdown).toContain('{#1}');
    expect(markdown).toContain('{#2}');
    expect(markdown).toContain('{/1}');
    expect(markdown).toContain('{/2}');

    // Should not contain traditional syntax for comment A
    expect(markdown).not.toMatch(/\{==text in para 1==\}\{>>alice.*?note A.*?<<\}/);
  });

  test('should handle three-way overlap across multiple paragraphs', () => {
    // Comment A spans paras 1-3, B spans 2-3, C only in para 3
    const content: ContentItem[] = [
      { type: 'para' },
      { type: 'text', text: 'para 1', commentIds: new Set(['commentA']), formatting: {} },
      { type: 'para' },
      { type: 'text', text: 'para 2', commentIds: new Set(['commentA', 'commentB']), formatting: {} },
      { type: 'para' },
      { type: 'text', text: 'para 3', commentIds: new Set(['commentA', 'commentB', 'commentC']), formatting: {} },
    ];

    const comments = new Map<string, Comment>([
      ['commentA', { author: 'alice', text: 'note A', date: '2024-01-01T12:00:00Z' }],
      ['commentB', { author: 'bob', text: 'note B', date: '2024-01-01T12:00:00Z' }],
      ['commentC', { author: 'charlie', text: 'note C', date: '2024-01-01T12:00:00Z' }],
    ]);

    const markdown = buildMarkdown(content, comments);

    // Each comment body should appear exactly once
    const commentAMatches = markdown.match(/\{#?\d*>>alice.*?note A.*?<<\}/g);
    const commentBMatches = markdown.match(/\{#?\d*>>bob.*?note B.*?<<\}/g);
    const commentCMatches = markdown.match(/\{#?\d*>>charlie.*?note C.*?<<\}/g);

    expect(commentAMatches!.length).toBe(1);
    expect(commentBMatches!.length).toBe(1);
    expect(commentCMatches!.length).toBe(1);
  });

  test('should not affect non-overlapping comments in separate paragraphs', () => {
    // Comment A in para 1, Comment B in para 2 (no overlap)
    const content: ContentItem[] = [
      { type: 'para' },
      { type: 'text', text: 'para 1', commentIds: new Set(['commentA']), formatting: {} },
      { type: 'para' },
      { type: 'text', text: 'para 2', commentIds: new Set(['commentB']), formatting: {} },
    ];

    const comments = new Map<string, Comment>([
      ['commentA', { author: 'alice', text: 'note A', date: '2024-01-01T12:00:00Z' }],
      ['commentB', { author: 'bob', text: 'note B', date: '2024-01-01T12:00:00Z' }],
    ]);

    const markdown = buildMarkdown(content, comments);

    // Non-overlapping comments should use traditional syntax
    expect(markdown).toContain('{>>alice');
    expect(markdown).toContain('{>>bob');
    expect(markdown).not.toContain('{#1}');
    expect(markdown).not.toContain('{#2}');
  });
});
