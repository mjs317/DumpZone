import { Client } from '@notionhq/client';

let notionClient: Client | null = null;
let notionDatabaseId: string | null = null;

export function initializeNotion(token: string, databaseId: string): void {
  notionClient = new Client({ auth: token });
  notionDatabaseId = databaseId;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('notion-token', token);
    localStorage.setItem('notion-database-id', databaseId);
  }
}

export function getNotionConfig(): { token: string | null; databaseId: string | null } {
  if (typeof window === 'undefined') {
    return { token: null, databaseId: null };
  }
  
  return {
    token: localStorage.getItem('notion-token'),
    databaseId: localStorage.getItem('notion-database-id'),
  };
}

export function isNotionConnected(): boolean {
  const config = getNotionConfig();
  return !!(config.token && config.databaseId);
}

// Helper function to extract text from HTML
function htmlToText(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: simple regex to strip tags
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  
  // Client-side: use DOM to extract text
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export async function saveToNotion(content: string, date: string): Promise<boolean> {
  console.log('📝 saveToNotion: Starting save for date:', date, 'content length:', content.length);
  
  const config = getNotionConfig();
  
  if (!config.token || !config.databaseId) {
    console.error('❌ saveToNotion: Notion not configured - token:', !!config.token, 'databaseId:', !!config.databaseId);
    return false;
  }
  
  console.log('✅ saveToNotion: Notion configured, initializing client...');
  
  if (!notionClient) {
    notionClient = new Client({ auth: config.token });
  }
  
  // Convert HTML to plain text
  const textContent = htmlToText(content);
  
  if (!textContent.trim()) {
    console.log('⚠️ saveToNotion: Content is empty after HTML conversion, skipping');
    return false; // Don't save empty content
  }
  
  console.log('📝 saveToNotion: Converted HTML to text, length:', textContent.length);
  
  try {
    console.log('📤 saveToNotion: Creating Notion page...');
    const result = await notionClient.pages.create({
      parent: {
        database_id: config.databaseId,
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: `Dump Zone - ${date}`,
              },
            },
          ],
        },
        Date: {
          date: {
            start: date,
          },
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: textContent,
                },
              },
            ],
          },
        },
      ],
    });
    
    console.log('✅ saveToNotion: Successfully created Notion page:', result.id);
    return true;
  } catch (error: any) {
    console.error('❌ saveToNotion: Failed to save to Notion:', error);
    console.error('❌ saveToNotion: Error details:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
    });
    return false;
  }
}

export function disconnectNotion(): void {
  notionClient = null;
  notionDatabaseId = null;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('notion-token');
    localStorage.removeItem('notion-database-id');
  }
}

