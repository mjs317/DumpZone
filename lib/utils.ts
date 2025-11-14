// Text utility functions
export function getWordCount(text: string): number {
  const htmlText = text.replace(/<[^>]*>/g, '');
  const words = htmlText.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

export function getCharacterCount(text: string): number {
  const htmlText = text.replace(/<[^>]*>/g, '');
  return htmlText.length;
}

export function stripHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// Search utility
export function searchInContent(content: string, query: string): boolean {
  const text = stripHtml(content).toLowerCase();
  return text.includes(query.toLowerCase());
}

// Export utilities
export function exportAsText(content: string): string {
  return stripHtml(content);
}

export function exportAsMarkdown(content: string): string {
  // Simple HTML to Markdown conversion
  let md = content
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  
  return md;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

