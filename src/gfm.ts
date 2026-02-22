/** GFM disallowed raw HTML tags (extension §6.11). */
const DISALLOWED_RAW_HTML_TAGS = new Set([
  'title',
  'textarea',
  'style',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'script',
  'plaintext',
]);

function getLeadingRawHtmlTagName(html: string): string | undefined {
  const match = html.match(/^\s*<\/?([A-Za-z][A-Za-z0-9-]*)(?:\s|>|\/)/);
  if (!match) return undefined;
  return match[1].toLowerCase();
}

export function isGfmDisallowedRawHtml(html: string): boolean {
  const tagName = getLeadingRawHtmlTagName(html);
  return !!tagName && DISALLOWED_RAW_HTML_TAGS.has(tagName);
}

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseTaskListMarker(text: string): { checked: boolean; rest: string } | undefined {
  const match = text.match(/^\[( |x|X)\]\s+/);
  if (!match) return undefined;
  return {
    checked: match[1].toLowerCase() === 'x',
    rest: text.slice(match[0].length),
  };
}
