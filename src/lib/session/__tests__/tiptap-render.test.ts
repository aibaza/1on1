// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { contentToHtml } from '../tiptap-render';

describe('contentToHtml', () => {
  // Test 1: HTML string passthrough — an existing HTML string must come back unchanged
  it('returns an HTML string unchanged (passthrough)', () => {
    const html = '<p>Hello</p>';
    expect(contentToHtml(html)).toBe('<p>Hello</p>');
  });

  // Test 2: Tiptap JSON object — must render to HTML, not "[object Object]"
  it('converts a Tiptap JSON document object to an HTML string containing the text', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    };
    const result = contentToHtml(doc);
    expect(result).not.toBe('[object Object]');
    expect(result).toContain('Hello');
  });

  // Test 3: null input — must return empty string
  it('returns "" for null input', () => {
    expect(contentToHtml(null)).toBe('');
  });

  // Test 4: undefined input — must return empty string
  it('returns "" for undefined input', () => {
    expect(contentToHtml(undefined)).toBe('');
  });

  // Test 5: malformed object (not a valid Tiptap doc) — must not throw, must return ""
  it('returns "" for a malformed object without throwing', () => {
    expect(() => contentToHtml({ broken: true })).not.toThrow();
    expect(contentToHtml({ broken: true })).toBe('');
  });
});
