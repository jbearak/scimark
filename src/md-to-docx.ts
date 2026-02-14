import MarkdownIt from 'markdown-it';

// Types for the parsed token stream
export interface MdToken {
  type: 'paragraph' | 'heading' | 'list_item' | 'blockquote' | 'code_block' | 'table' | 'hr';
  level?: number;           // heading level 1-6, blockquote nesting, list nesting
  ordered?: boolean;        // for list items
  runs: MdRun[];            // inline content
  rows?: MdTableRow[];      // for tables
  language?: string;        // for code blocks
}

export interface MdTableRow {
  cells: MdRun[][];         // each cell has runs
  header: boolean;
}

export interface MdRun {
  type: 'text' | 'critic_add' | 'critic_del' | 'critic_sub' | 'critic_highlight' | 'critic_comment' | 'citation' | 'math' | 'softbreak';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  highlight?: boolean;
  highlightColor?: string;  // for ==text=={color}
  superscript?: boolean;
  subscript?: boolean;
  code?: boolean;           // inline code
  href?: string;            // hyperlink URL
  // CriticMarkup specific
  newText?: string;         // for substitutions: {~~old~>new~~}
  author?: string;          // for comments/revisions
  date?: string;            // for comments/revisions
  commentText?: string;     // for critic_comment: the comment body
  // Citation specific
  keys?: string[];          // citation keys for [@key1; @key2]
  locators?: Map<string, string>; // key -> locator for [@key, p. 20]
  // Math specific
  display?: boolean;        // display math ($$...$$) vs inline ($...$)
}

const VALID_COLORS = new Set([
  'yellow', 'green', 'turquoise', 'pink', 'blue', 'red', 'dark-blue', 
  'teal', 'violet', 'dark-red', 'dark-yellow', 'gray-50', 'gray-25', 'black'
]);

// Custom inline rules
function criticMarkupRule(state: any, silent: boolean): boolean {
  const start = state.pos;
  const max = state.posMax;
  
  if (start + 3 >= max || state.src.charAt(start) !== '{') return false;
  
  const marker = state.src.slice(start, start + 3);
  let endMarker: string;
  let type: string;
  
  switch (marker) {
    case '{++': endMarker = '++}'; type = 'critic_add'; break;
    case '{--': endMarker = '--}'; type = 'critic_del'; break;
    case '{~~': endMarker = '~~}'; type = 'critic_sub'; break;
    case '{==': endMarker = '==}'; type = 'critic_highlight'; break;
    case '{>>': endMarker = '<<}'; type = 'critic_comment'; break;
    default: return false;
  }
  
  const endPos = state.src.indexOf(endMarker, start + 3);
  if (endPos === -1) return false;
  
  if (!silent) {
    const content = state.src.slice(start + 3, endPos);
    const token = state.push('critic_markup', '', 0);
    token.markup = marker;
    token.content = content;
    token.criticType = type;
    
    if (type === 'critic_sub') {
      const sepPos = content.indexOf('~>');
      if (sepPos !== -1) {
        token.oldText = content.slice(0, sepPos);
        token.newText = content.slice(sepPos + 2);
      }
    }
    
    if (type === 'critic_comment') {
      const match = content.match(/^(.+?)\s+\(([^)]+)\):\s*(.*)$/);
      if (match) {
        token.author = match[1];
        token.date = match[2];
        token.commentText = match[3];
      } else if (content.trim()) {
        // If it contains a colon, treat as comment text
        // If it looks like a valid author name (alphanumeric, underscore, dash), treat as author
        // Otherwise, treat as comment text
        if (content.includes(':') || content.includes(' ') || /[^a-zA-Z0-9_-]/.test(content)) {
          token.commentText = content;
        } else {
          token.author = content;
          token.commentText = '';
        }
      } else {
        // Empty comment
        token.commentText = '';
      }
    }
  }
  
  state.pos = endPos + endMarker.length;
  return true;
}

function coloredHighlightRule(state: any, silent: boolean): boolean {
  const start = state.pos;
  const max = state.posMax;
  
  if (start + 2 >= max || state.src.slice(start, start + 2) !== '==') return false;
  
  const endPos = state.src.indexOf('==', start + 2);
  if (endPos === -1) return false;
  
  const afterEnd = endPos + 2;
  if (afterEnd < max && state.src.charAt(afterEnd) === '{') {
    const colorEnd = state.src.indexOf('}', afterEnd + 1);
    if (colorEnd !== -1) {
      const color = state.src.slice(afterEnd + 1, colorEnd);
      if (VALID_COLORS.has(color)) {
        if (!silent) {
          const content = state.src.slice(start + 2, endPos);
          const token = state.push('colored_highlight', '', 0);
          token.content = content;
          token.color = color;
        }
        state.pos = colorEnd + 1;
        return true;
      }
    }
  }
  
  // Plain highlight
  if (!silent) {
    const content = state.src.slice(start + 2, endPos);
    const token = state.push('plain_highlight', '', 0);
    token.content = content;
  }
  state.pos = endPos + 2;
  return true;
}

function citationRule(state: any, silent: boolean): boolean {
  const start = state.pos;
  const max = state.posMax;
  
  if (start + 2 >= max || state.src.slice(start, start + 2) !== '[@') return false;
  
  const endPos = state.src.indexOf(']', start + 2);
  if (endPos === -1) return false;
  
  if (!silent) {
    const content = state.src.slice(start + 2, endPos);
    const token = state.push('citation', '', 0);
    token.content = content;
    
    const keys: string[] = [];
    const locators = new Map<string, string>();
    
    const parts = content.split(';').map(p => p.trim());
    for (const part of parts) {
      const commaPos = part.indexOf(',');
      if (commaPos !== -1) {
        const key = part.slice(0, commaPos).trim();
        const locator = part.slice(commaPos + 1).trim();
        keys.push(key);
        locators.set(key, locator);
      } else {
        keys.push(part);
      }
    }
    
    token.keys = keys;
    token.locators = locators;
  }
  
  state.pos = endPos + 1;
  return true;
}

function mathRule(state: any, silent: boolean): boolean {
  const start = state.pos;
  const max = state.posMax;
  
  if (start >= max || state.src.charAt(start) !== '$') return false;
  
  // Check for display math
  if (start + 1 < max && state.src.charAt(start + 1) === '$') {
    const endPos = state.src.indexOf('$$', start + 2);
    if (endPos === -1) return false;
    
    if (!silent) {
      const content = state.src.slice(start + 2, endPos);
      const token = state.push('math', '', 0);
      token.content = content;
      token.display = true;
    }
    state.pos = endPos + 2;
    return true;
  }
  
  // Inline math - don't match $ in middle of words
  if (start > 0 && /\w/.test(state.src.charAt(start - 1))) return false;
  
  const endPos = state.src.indexOf('$', start + 1);
  if (endPos === -1) return false;
  
  // Don't match $ at end if followed by word character
  if (endPos + 1 < max && /\w/.test(state.src.charAt(endPos + 1))) return false;
  
  if (!silent) {
    const content = state.src.slice(start + 1, endPos);
    const token = state.push('math', '', 0);
    token.content = content;
    // Don't set display for inline math - leave it undefined
  }
  state.pos = endPos + 1;
  return true;
}

function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({ html: true });
  
  md.inline.ruler.before('emphasis', 'colored_highlight', coloredHighlightRule);
  md.inline.ruler.before('emphasis', 'critic_markup', criticMarkupRule);
  md.inline.ruler.before('emphasis', 'citation', citationRule);
  md.inline.ruler.before('emphasis', 'math', mathRule);
  
  return md;
}

export function parseMd(markdown: string): MdToken[] {
  const md = createMarkdownIt();
  const tokens = md.parse(markdown, {});
  
  return convertTokens(tokens);
}

function convertTokens(tokens: any[]): MdToken[] {
  const result: MdToken[] = [];
  let i = 0;
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    switch (token.type) {
      case 'heading_open':
        const headingClose = findClosingToken(tokens, i, 'heading_close');
        result.push({
          type: 'heading',
          level: parseInt(token.tag.slice(1)),
          runs: convertInlineTokens(tokens.slice(i + 1, headingClose))
        });
        i = headingClose + 1;
        break;
        
      case 'paragraph_open':
        const paragraphClose = findClosingToken(tokens, i, 'paragraph_close');
        result.push({
          type: 'paragraph',
          runs: convertInlineTokens(tokens.slice(i + 1, paragraphClose))
        });
        i = paragraphClose + 1;
        break;
        
      case 'bullet_list_open':
      case 'ordered_list_open':
        const listClose = findClosingToken(tokens, i, token.type.replace('_open', '_close'));
        const listItems = extractListItems(tokens.slice(i + 1, listClose));
        result.push(...listItems.map(item => ({
          type: 'list_item' as const,
          ordered: token.type === 'ordered_list_open',
          level: 1, // TODO: handle nesting
          runs: item
        })));
        i = listClose + 1;
        break;
        
      case 'blockquote_open':
        const blockquoteClose = findClosingToken(tokens, i, 'blockquote_close');
        const blockquoteTokens = convertTokens(tokens.slice(i + 1, blockquoteClose));
        result.push(...blockquoteTokens.map(t => ({
          ...t,
          type: 'blockquote' as const,
          level: 1 // TODO: handle nesting
        })));
        i = blockquoteClose + 1;
        break;
        
      case 'fence':
        result.push({
          type: 'code_block',
          language: token.info || undefined,
          runs: [{ type: 'text', text: token.content }]
        });
        i++;
        break;
        
      case 'table_open':
        const tableClose = findClosingToken(tokens, i, 'table_close');
        const tableData = extractTableData(tokens.slice(i + 1, tableClose));
        result.push({
          type: 'table',
          runs: [],
          rows: tableData
        });
        i = tableClose + 1;
        break;
        
      case 'hr':
        result.push({
          type: 'hr',
          runs: []
        });
        i++;
        break;
        
      default:
        i++;
        break;
    }
  }
  
  return result;
}

function convertInlineTokens(tokens: any[]): MdRun[] {
  const runs: MdRun[] = [];
  
  for (const token of tokens) {
    if (token.type === 'inline' && token.children) {
      // Process the children of inline tokens
      runs.push(...processInlineChildren(token.children));
    } else {
      // Single token processing
      const tokenRuns = processInlineChildren([token]);
      runs.push(...tokenRuns);
    }
  }
  
  return runs;
}

function processInlineChildren(tokens: any[]): MdRun[] {
  const runs: MdRun[] = [];
  const formatStack: any = {};
  let currentHref: string | undefined;
  
  for (const token of tokens) {
    if (token.type === 'inline' && token.children) {
      // Process the children directly - they should already have custom tokens
      runs.push(...processInlineChildren(token.children));
      continue;
    }
    
    switch (token.type) {
      case 'text':
        if (token.content) {  // Only add non-empty text
          runs.push({
            type: 'text',
            text: token.content,
            ...formatStack,
            href: currentHref
          });
        }
        break;
        
      case 'code_inline':
        runs.push({
          type: 'text',
          text: token.content,
          code: true,
          ...formatStack,
          href: currentHref
        });
        break;
        
      case 'softbreak':
        runs.push({ type: 'softbreak', text: '\n' });
        break;
        
      case 'strong_open':
        formatStack.bold = true;
        break;
      case 'strong_close':
        delete formatStack.bold;
        break;
        
      case 'em_open':
        formatStack.italic = true;
        break;
      case 'em_close':
        delete formatStack.italic;
        break;
        
      case 's_open':
        formatStack.strikethrough = true;
        break;
      case 's_close':
        delete formatStack.strikethrough;
        break;
        
      case 'link_open':
        currentHref = token.attrGet('href');
        break;
      case 'link_close':
        currentHref = undefined;
        break;
        
      case 'html_inline':
        const html = token.content;
        if (html === '<u>') formatStack.underline = true;
        else if (html === '</u>') delete formatStack.underline;
        else if (html === '<sup>') formatStack.superscript = true;
        else if (html === '</sup>') delete formatStack.superscript;
        else if (html === '<sub>') formatStack.subscript = true;
        else if (html === '</sub>') delete formatStack.subscript;
        break;
        
      case 'critic_markup':
        if (token.criticType === 'critic_sub') {
          runs.push({
            type: 'critic_sub',
            text: token.oldText || '',
            newText: token.newText || '',
            ...formatStack,
            href: currentHref
          });
        } else if (token.criticType === 'critic_comment') {
          runs.push({
            type: 'critic_comment',
            text: '',
            author: token.author,
            date: token.date,
            commentText: token.commentText,
            ...formatStack,
            href: currentHref
          });
        } else {
          runs.push({
            type: token.criticType,
            text: token.content,
            author: token.author,
            date: token.date,
            ...formatStack,
            href: currentHref
          });
        }
        break;
        
      case 'colored_highlight':
        runs.push({
          type: 'critic_highlight',
          text: token.content,
          highlight: true,
          highlightColor: token.color,
          ...formatStack,
          href: currentHref
        });
        break;
        
      case 'plain_highlight':
        runs.push({
          type: 'critic_highlight',
          text: token.content,
          highlight: true,
          ...formatStack,
          href: currentHref
        });
        break;
        
      case 'citation':
        runs.push({
          type: 'citation',
          text: token.content,
          keys: token.keys,
          locators: token.locators,
          ...formatStack,
          href: currentHref
        });
        break;
        
      case 'math':
        runs.push({
          type: 'math',
          text: token.content,
          display: token.display,
          ...formatStack,
          href: currentHref
        });
        break;
    }
  }
  
  return runs;
}

function findClosingToken(tokens: any[], start: number, closeType: string): number {
  let depth = 1;
  for (let i = start + 1; i < tokens.length; i++) {
    if (tokens[i].type === tokens[start].type) depth++;
    else if (tokens[i].type === closeType) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return tokens.length;
}

function extractListItems(tokens: any[]): MdRun[][] {
  const items: MdRun[][] = [];
  let i = 0;
  
  while (i < tokens.length) {
    if (tokens[i].type === 'list_item_open') {
      const closePos = findClosingToken(tokens, i, 'list_item_close');
      // Find paragraph content within the list item
      const itemTokens = tokens.slice(i + 1, closePos);
      let runs: MdRun[] = [];
      
      for (let j = 0; j < itemTokens.length; j++) {
        if (itemTokens[j].type === 'paragraph_open') {
          const paragraphClose = findClosingToken(itemTokens, j, 'paragraph_close');
          runs = processInlineChildren(itemTokens.slice(j + 1, paragraphClose));
          break;
        } else if (itemTokens[j].type === 'inline') {
          // Direct inline content
          runs = processInlineChildren([itemTokens[j]]);
          break;
        }
      }
      
      items.push(runs);
      i = closePos + 1;
    } else {
      i++;
    }
  }
  
  return items;
}

function extractTableData(tokens: any[]): MdTableRow[] {
  const rows: MdTableRow[] = [];
  let i = 0;
  let isHeader = true;
  
  while (i < tokens.length) {
    if (tokens[i].type === 'tr_open') {
      const closePos = findClosingToken(tokens, i, 'tr_close');
      const cells = extractTableCells(tokens.slice(i + 1, closePos));
      rows.push({ cells, header: isHeader });
      isHeader = false;
      i = closePos + 1;
    } else {
      i++;
    }
  }
  
  return rows;
}

function extractTableCells(tokens: any[]): MdRun[][] {
  const cells: MdRun[][] = [];
  let i = 0;
  
  while (i < tokens.length) {
    if (tokens[i].type === 'td_open' || tokens[i].type === 'th_open') {
      const closeType = tokens[i].type.replace('_open', '_close');
      const closePos = findClosingToken(tokens, i, closeType);
      cells.push(convertInlineTokens(tokens.slice(i + 1, closePos)));
      i = closePos + 1;
    } else {
      i++;
    }
  }
  
  return cells;
}

export function prettyPrintMd(tokens: MdToken[]): string {
  const lines: string[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    
    switch (token.type) {
      case 'heading':
        const hashes = '#'.repeat(token.level || 1);
        lines.push(hashes + ' ' + formatRuns(token.runs));
        lines.push('');
        break;
        
      case 'paragraph':
        lines.push(formatRuns(token.runs));
        lines.push('');
        break;
        
      case 'list_item':
        const indent = '  '.repeat((token.level || 1) - 1);
        const marker = token.ordered ? '1. ' : '- ';
        lines.push(indent + marker + formatRuns(token.runs));
        // Add blank line if next token is not a list item
        if (nextToken && nextToken.type !== 'list_item') {
          lines.push('');
        }
        break;
        
      case 'blockquote':
        const prefix = '>'.repeat(token.level || 1) + ' ';
        lines.push(prefix + formatRuns(token.runs));
        // Add blank line if next token is not a blockquote
        if (nextToken && nextToken.type !== 'blockquote') {
          lines.push('');
        }
        break;
        
      case 'code_block':
        const lang = token.language || '';
        lines.push('```' + lang);
        const codeContent = token.runs[0]?.text || '';
        // Don't add extra newline if content already ends with one
        const trimmedContent = codeContent.endsWith('\n') ? codeContent.slice(0, -1) : codeContent;
        lines.push(trimmedContent);
        lines.push('```');
        lines.push('');
        break;
        
      case 'table':
        if (token.rows) {
          for (let j = 0; j < token.rows.length; j++) {
            const row = token.rows[j];
            const cellTexts = row.cells.map(cell => formatRuns(cell));
            lines.push('| ' + cellTexts.join(' | ') + ' |');
            
            if (j === 0 && row.header) {
              const separator = cellTexts.map(() => '---').join(' | ');
              lines.push('| ' + separator + ' |');
            }
          }
          lines.push('');
        }
        break;
        
      case 'hr':
        lines.push('---');
        lines.push('');
        break;
    }
  }
  
  return lines.join('\n').replace(/\n+$/, '\n');
}

function formatRuns(runs: MdRun[]): string {
  return runs.map(run => {
    let text = run.text;
    
    switch (run.type) {
      case 'critic_add':
        return '{++' + text + '++}';
      case 'critic_del':
        return '{--' + text + '--}';
      case 'critic_sub':
        return '{~~' + text + '~>' + (run.newText || '') + '~~}';
      case 'critic_highlight':
        if (run.highlightColor) {
          return '==' + text + '=={' + run.highlightColor + '}';
        }
        return '==' + text + '==';
      case 'critic_comment':
        if (run.author && run.date && run.commentText) {
          return '{>>' + run.author + ' (' + run.date + '): ' + run.commentText + '<<}';
        } else if (run.commentText) {
          return '{>>' + run.commentText + '<<}';
        } else if (run.author) {
          return '{>>' + run.author + '<<}';
        }
        return '{>><<}';  // Empty comment
      case 'citation':
        if (run.keys && run.locators && run.locators.size > 0) {
          const parts = run.keys.map(key => {
            const locator = run.locators!.get(key);
            return locator ? key + ', ' + locator : key;
          });
          return '[@' + parts.join('; ') + ']';
        } else if (run.keys) {
          return '[@' + run.keys.join('; ') + ']';
        }
        return '[@' + text + ']';
      case 'math':
        if (run.display) {
          return '$$' + text + '$$';
        }
        return '$' + text + '$';
      case 'softbreak':
        return '\n';
      default:
        // Apply formatting
        if (run.bold && run.italic) text = '***' + text + '***';
        else if (run.bold) text = '**' + text + '**';
        else if (run.italic) text = '*' + text + '*';
        
        if (run.strikethrough) text = '~~' + text + '~~';
        if (run.underline) text = '<u>' + text + '</u>';
        if (run.superscript) text = '<sup>' + text + '</sup>';
        if (run.subscript) text = '<sub>' + text + '</sub>';
        if (run.code) text = '`' + text + '`';
        
        if (run.href) {
          const needsAngles = /[()[\]\s]/.test(run.href);
          const url = needsAngles ? '<' + run.href + '>' : run.href;
          text = '[' + text + '](' + url + ')';
        }
        
        return text;
    }
  }).join('');
}