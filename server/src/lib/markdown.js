/**
 * Minimal, deliberately conservative Markdown renderer.
 * Input is escaped first, then a small allow-list of syntax is applied.
 * This makes stored XSS impossible even when admins paste HTML.
 */

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const inline = (text) =>
  text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_m, label, href) =>
      `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`
    );

export function renderMarkdown(markdown = '') {
  const lines = escapeHtml(markdown).replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let list = null; // 'ul' | 'ol'
  let inTable = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };
  const closeTable = () => {
    if (inTable) {
      html.push('</tbody></table>');
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      closeList();
      closeTable();
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      closeTable();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^&gt;\s?/.test(line)) {
      flushParagraph();
      closeList();
      closeTable();
      html.push(`<blockquote>${inline(line.replace(/^&gt;\s?/, ''))}</blockquote>`);
      continue;
    }

    const tableHeader = line.match(/^\|(.+)\|$/);
    if (tableHeader && /^\|[\s:|-]+\|$/.test((lines[i + 1] || '').trim())) {
      flushParagraph();
      closeList();
      const cells = tableHeader[1].split('|').map((c) => c.trim());
      html.push(`<table><thead><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`);
      inTable = true;
      i += 1;
      continue;
    }
    if (inTable && tableHeader) {
      const cells = tableHeader[1].split('|').map((c) => c.trim());
      html.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ol || ul) {
      flushParagraph();
      closeTable();
      const kind = ol ? 'ol' : 'ul';
      if (list !== kind) {
        closeList();
        html.push(`<${kind}>`);
        list = kind;
      }
      html.push(`<li>${inline((ol || ul)[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  closeList();
  closeTable();
  return html.join('\n');
}

export default renderMarkdown;
