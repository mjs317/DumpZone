import { DumpEntry } from './storage';
import { exportAsText, exportAsMarkdown, stripHtml } from './utils';

export async function exportAsPDF(entries: DumpEntry[]): Promise<void> {
  // For PDF, we'll use a simple approach with window.print or a library
  // For now, we'll create an HTML document that can be printed
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Dump Zone Export</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .entry { margin-bottom: 30px; page-break-inside: avoid; }
        .date { font-weight: bold; color: #666; margin-bottom: 10px; }
        .content { line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>Dump Zone Export</h1>
      ${entries.map(entry => `
        <div class="entry">
          <div class="date">${new Date(entry.date).toLocaleDateString()}</div>
          <div class="content">${entry.content}</div>
        </div>
      `).join('')}
    </body>
    </html>
  `;
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dump-zone-export-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAsJSON(entries: DumpEntry[]): void {
  const json = JSON.stringify(entries, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dump-zone-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEntryAsMarkdown(entry: DumpEntry): void {
  const md = `# Dump Zone - ${entry.date}\n\n${exportAsMarkdown(entry.content)}`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dump-zone-${entry.date}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEntryAsText(entry: DumpEntry): void {
  const text = exportAsText(entry.content);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dump-zone-${entry.date}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAllAsMarkdown(entries: DumpEntry[]): void {
  const md = entries.map(entry => 
    `# Dump Zone - ${entry.date}\n\n${exportAsMarkdown(entry.content)}\n\n---\n\n`
  ).join('\n');
  
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dump-zone-all-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAllAsText(entries: DumpEntry[]): void {
  const text = entries.map(entry => 
    `Dump Zone - ${entry.date}\n${'='.repeat(50)}\n\n${exportAsText(entry.content)}\n\n`
  ).join('\n');
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dump-zone-all-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

