'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getCurrentDayContent, saveCurrentDayContent } from '@/lib/storage-sync';
import { getWordCount, getCharacterCount } from '@/lib/utils';
import { syncService } from '@/lib/sync';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
interface TextEditorProps {
  onContentChange?: (content: string) => void;
  stickyOffset?: number;
}

export default function TextEditor({ onContentChange, stickyOffset = 12 }: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const maxUndoSteps = 50;
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window));
  const { theme } = useTheme();
  const recognitionRef = useRef<any>(null);
  const lastLocalContentRef = useRef<string>('');
  const lastAppliedCommitRef = useRef<number | null>(null);
  const { user } = useAuth();

  const getClosestChecklistItem = useCallback((node: Node | null): HTMLElement | null => {
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && node.classList.contains('dz-checklist-item')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }, []);

  const placeCaretAtEnd = useCallback((element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  useEffect(() => {
    // Load current day's content
    const loadContent = async () => {
      const savedContent = await getCurrentDayContent();
      setContent(savedContent);
      updateCounts(savedContent);
      lastLocalContentRef.current = savedContent;
      
      if (editorRef.current) {
        editorRef.current.innerHTML = savedContent;
        undoStackRef.current = [savedContent];
      }
    };

    loadContent();

    // Set up real-time sync if authenticated
    if (user) {
      syncService.subscribeToCurrentDay(({ content: syncedContent }) => {
        if (!editorRef.current) return;
        if (syncedContent === editorRef.current.innerHTML) return;
        // Apply any remote change that differs from current DOM
        editorRef.current.innerHTML = syncedContent;
        setContent(syncedContent);
        updateCounts(syncedContent);
        undoStackRef.current = [syncedContent];
        lastLocalContentRef.current = syncedContent;
      });

      // Safety net: periodic pull to avoid missed realtime events on mobile networks
      const pullInterval = setInterval(async () => {
        try {
          const latest = await getCurrentDayContent();
          if (editorRef.current && latest !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = latest;
            setContent(latest);
            updateCounts(latest);
            undoStackRef.current = [latest];
            lastLocalContentRef.current = latest;
          }
        } catch {
          // ignore transient errors
        }
      }, 2500);

      return () => {
        clearInterval(pullInterval);
        syncService.cleanup();
      };
    }

    return () => {
      syncService.cleanup();
    };
  }, [user]);

  const updateCounts = (text: string) => {
    setWordCount(getWordCount(text));
    setCharCount(getCharacterCount(text));
  };

  const saveToUndoStack = (content: string) => {
    if (undoStackRef.current[undoStackRef.current.length - 1] !== content) {
      undoStackRef.current.push(content);
      if (undoStackRef.current.length > maxUndoSteps) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = []; // Clear redo stack on new action
    }
  };

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const newContent = editorRef.current.innerHTML;
    setContent(newContent);
    updateCounts(newContent);
    saveToUndoStack(newContent);
    
    // For realtime sync, save immediately
    setSaveStatus('saving');
    const save = async () => {
      await saveCurrentDayContent(newContent);
      lastLocalContentRef.current = newContent;
      setSaveStatus('saved');
      if (onContentChange) {
        onContentChange(newContent);
      }
    };
    save();
  }, [onContentChange]);

  const createChecklistItem = useCallback((text: string) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'dz-checklist-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'dz-checkbox';
    checkbox.setAttribute('contenteditable', 'false');

    const textSpan = document.createElement('span');
    textSpan.className = 'dz-checklist-text';
    textSpan.setAttribute('contenteditable', 'true');
    textSpan.textContent = text || '\u200B';

    wrapper.appendChild(checkbox);
    wrapper.appendChild(textSpan);
    return { wrapper, textSpan };
  }, []);

  const exitChecklist = useCallback((currentItem: HTMLElement) => {
    const parent = currentItem.parentNode;
    const nextSibling = currentItem.nextSibling;
    currentItem.remove();

    const newLine = document.createElement('div');
    const br = document.createElement('br');
    newLine.appendChild(br);

    if (parent) {
      parent.insertBefore(newLine, nextSibling);
    } else if (editorRef.current) {
      editorRef.current.appendChild(newLine);
    }

    placeCaretAtEnd(newLine);
    handleInput();
  }, [handleInput, placeCaretAtEnd]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleCheckboxChange = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && target.matches('.dz-checkbox')) {
        const checkbox = target as HTMLInputElement;
        if (checkbox.checked) {
          checkbox.setAttribute('checked', 'checked');
        } else {
          checkbox.removeAttribute('checked');
        }
        handleInput();
      }
    };

    editor.addEventListener('change', handleCheckboxChange);
    return () => {
      editor.removeEventListener('change', handleCheckboxChange);
    };
  }, [handleInput]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleChecklistKeys = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== 'Tab') return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const checklistItem = getClosestChecklistItem(range.startContainer);
      if (!checklistItem) return;

      event.preventDefault();

      const textEl = checklistItem.querySelector<HTMLElement>('.dz-checklist-text');
      if (!textEl) return;

      const textValue = textEl.innerText.replace(/\u200B/g, '').trim();

      if (textValue.length === 0) {
        exitChecklist(checklistItem);
        return;
      }

      const { wrapper, textSpan } = createChecklistItem('');
      if (checklistItem.parentNode) {
        checklistItem.parentNode.insertBefore(wrapper, checklistItem.nextSibling);
      } else if (editorRef.current) {
        editorRef.current.appendChild(wrapper);
      }
      placeCaretAtEnd(textSpan);
      handleInput();
    };

    editor.addEventListener('keydown', handleChecklistKeys);
    return () => {
      editor.removeEventListener('keydown', handleChecklistKeys);
    };
  }, [handleInput, getClosestChecklistItem, createChecklistItem, exitChecklist, placeCaretAtEnd]);

  const handleUndo = useCallback(async (e?: React.MouseEvent | KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (undoStackRef.current.length <= 1 || !editorRef.current) return;
    
    const currentContent = editorRef.current.innerHTML;
    redoStackRef.current.push(currentContent);
    
    undoStackRef.current.pop();
    const previousContent = undoStackRef.current[undoStackRef.current.length - 1];
    
    editorRef.current.innerHTML = previousContent;
    setContent(previousContent);
    updateCounts(previousContent);
    await saveCurrentDayContent(previousContent);
    lastLocalContentRef.current = previousContent;
    setSaveStatus('saved');
    
    if (onContentChange) {
      onContentChange(previousContent);
    }
  }, [onContentChange]);

  const handleRedo = useCallback(async (e?: React.MouseEvent | KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (redoStackRef.current.length === 0 || !editorRef.current) return;
    
    const nextContent = redoStackRef.current.pop()!;
    undoStackRef.current.push(nextContent);
    
    editorRef.current.innerHTML = nextContent;
    setContent(nextContent);
    updateCounts(nextContent);
    await saveCurrentDayContent(nextContent);
    lastLocalContentRef.current = nextContent;
    setSaveStatus('saved');
    
    if (onContentChange) {
      onContentChange(nextContent);
    }
  }, [onContentChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo(e);
        return;
      }
      
      if ((modKey && e.key === 'y') || (modKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        handleRedo(e);
        return;
      }
      
      if (modKey && e.key === 'b') {
        e.preventDefault();
        execCommand('bold');
        return;
      }
      
      if (modKey && e.key === 'i') {
        e.preventDefault();
        execCommand('italic');
        return;
      }
      
      if (modKey && e.key === 'u') {
        e.preventDefault();
        execCommand('underline');
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    if (!editorRef.current) return;
    const nodes = editorRef.current.querySelectorAll<HTMLElement>('[data-dynamic-color="black"]');
    const resolved = theme === 'dark' ? '#FFFFFF' : '#000000';
    nodes.forEach((node) => {
      node.style.color = resolved;
    });
  }, [theme]);

  // Image paste support
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target?.result as string;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);
              range.setStartAfter(img);
              range.setEndAfter(img);
              selection.removeAllRanges();
              selection.addRange(range);
            } else if (editorRef.current) {
              editorRef.current.appendChild(img);
            }
            
            handleInput();
          };
          reader.readAsDataURL(blob);
        }
        return;
      }
    }
  }, [handleInput]);

  // Voice input (mobile)
  const handleVoiceInput = useCallback(() => {
    if (!isSpeechSupported) {
      alert('Voice input is not supported in your browser.');
      return;
    }
    
    // If already recording, stop
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          transcript += result[0].transcript;
        }
      }
      if (!transcript.trim()) return;
      
      if (editorRef.current) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(transcript);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          editorRef.current.textContent += transcript;
        }
        handleInput();
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  }, [handleInput, isSpeechSupported]);

  const handleClear = async () => {
    const confirmed = typeof window !== 'undefined' && window.confirm(
      'Are you sure you want to clear your entire dump? This cannot be undone.'
    );
    
    if (confirmed && editorRef.current) {
      editorRef.current.innerHTML = '';
      setContent('');
      await saveCurrentDayContent('');
      lastLocalContentRef.current = '';
      updateCounts('');
      undoStackRef.current = [''];
      redoStackRef.current = [];
      editorRef.current.focus();
      
      if (onContentChange) {
        onContentChange('');
      }
    }
  };

  const execCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      document.execCommand(command, false, value);
      handleInput();
    }
  };

  const insertChecklist = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection) return;

    let range: Range;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const fragment = range.cloneContents();
    const selectedText = fragment.textContent?.trim() || '';
    const lines =
      selectedText.length > 0
        ? selectedText.split(/\n+/).map(line => line.trim()).filter(Boolean)
        : [''];

    if (!range.collapsed) {
      range.deleteContents();
    }

    const docFragment = document.createDocumentFragment();
    let lastSpan: HTMLElement | null = null;

    lines.forEach(line => {
      const { wrapper, textSpan } = createChecklistItem(line);
      docFragment.appendChild(wrapper);
      lastSpan = textSpan;
    });

    range.insertNode(docFragment);

    if (lastSpan) {
      const newRange = document.createRange();
      newRange.selectNodeContents(lastSpan);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    handleInput();
  };

  const insertList = (ordered: boolean) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    
    if (!selection) return;
    
    let range: Range;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      const editor = editorRef.current;
      
      if (editor.childNodes.length > 0) {
        const lastNode = editor.childNodes[editor.childNodes.length - 1];
        if (lastNode.nodeType === Node.TEXT_NODE) {
          const textNode = lastNode as Text;
          range.setStart(textNode, textNode.length);
          range.setEnd(textNode, textNode.length);
        } else {
          range.setStartAfter(lastNode);
          range.setEndAfter(lastNode);
        }
      } else {
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    let currentNode: Node | null = range.commonAncestorContainer;
    let listElement: HTMLElement | null = null;
    
    while (currentNode && currentNode !== editorRef.current) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const el = currentNode as HTMLElement;
        if (el.tagName === 'UL' || el.tagName === 'OL') {
          listElement = el;
          break;
        }
      }
      currentNode = currentNode.parentNode;
    }
    
    if (listElement && 
        ((ordered && listElement.tagName === 'OL') || 
         (!ordered && listElement.tagName === 'UL'))) {
      let liElement: HTMLElement | null = null;
      currentNode = range.commonAncestorContainer;
      while (currentNode && currentNode !== listElement) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const el = currentNode as HTMLElement;
          if (el.tagName === 'LI') {
            liElement = el;
            break;
          }
        }
        currentNode = currentNode.parentNode;
      }
      
      if (liElement) {
        const newLi = document.createElement('li');
        newLi.textContent = '\u200B';
        if (liElement.nextSibling) {
          listElement.insertBefore(newLi, liElement.nextSibling);
        } else {
          listElement.appendChild(newLi);
        }
        range.setStart(newLi, 0);
        range.setEnd(newLi, 0);
        selection.removeAllRanges();
        selection.addRange(range);
        handleInput();
        return;
      }
    }
    
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    const success = document.execCommand(command, false, undefined);
    
    if (!success) {
      const list = document.createElement(ordered ? 'ol' : 'ul');
      const listItem = document.createElement('li');
      
      const selectedText = range.toString().trim();
      if (selectedText) {
        listItem.textContent = selectedText;
        range.deleteContents();
      } else {
        listItem.textContent = '\u200B';
      }
      
      list.appendChild(listItem);
      range.insertNode(list);
      
      const newRange = document.createRange();
      if (selectedText) {
        newRange.setStart(listItem.firstChild || listItem, selectedText.length);
        newRange.setEnd(listItem.firstChild || listItem, selectedText.length);
      } else {
        newRange.setStart(listItem, 0);
        newRange.setEnd(listItem, 0);
      }
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    handleInput();
  };

  const formatText = (format: string, value?: string) => {
    execCommand(format, value);
  };

  const wrapSelectionWithDynamicColor = (colorKey: 'black', colorValue: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      const span = document.createElement('span');
      span.dataset.dynamicColor = colorKey;
      span.style.color = colorValue;
      span.textContent = '\u200B';
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      const span = document.createElement('span');
      span.dataset.dynamicColor = colorKey;
      span.style.color = colorValue;
      span.appendChild(range.extractContents());
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    handleInput();
  };

  const applyTextColor = (color: string) => {
    if (color === '#000000') {
      const resolved = theme === 'dark' ? '#FFFFFF' : '#000000';
      wrapSelectionWithDynamicColor('black', resolved);
    } else {
      formatText('foreColor', color);
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;
    const nodes = editorRef.current.querySelectorAll<HTMLElement>('[data-dynamic-color="black"]');
    const resolved = theme === 'dark' ? '#FFFFFF' : '#000000';
    nodes.forEach((node) => {
      node.style.color = resolved;
    });
  }, [theme]);

  const colorOptions = [
    { label: 'Black', value: '#000000', swatch: 'bg-gray-900' },
    { label: 'Red', value: '#ef4444', swatch: 'bg-red-500' },
    { label: 'Blue', value: '#3b82f6', swatch: 'bg-blue-500' },
    { label: 'Green', value: '#10b981', swatch: 'bg-green-500' },
    { label: 'Orange', value: '#f59e0b', swatch: 'bg-orange-500' },
    { label: 'Purple', value: '#8b5cf6', swatch: 'bg-purple-500' },
  ];

  const handleButtonClick = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (command === 'insertUnorderedList') {
      insertList(false);
    } else if (command === 'insertOrderedList') {
      insertList(true);
    } else if (command === 'insertChecklist') {
      insertChecklist();
    } else {
      formatText(command, value);
    }
  };

  const computedTop = Math.max(stickyOffset ?? 12, 0);
  const editorMaxHeight = `calc(100vh - ${computedTop + 220}px)`;

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      {/* Toolbar */}
      <div
        className="flex flex-wrap justify-center items-center gap-1.5 p-2 border-b bg-gray-50/95 dark:bg-gray-800/95 rounded-t-lg sticky z-30 backdrop-blur"
        style={{ top: computedTop }}
      >
        {/* Undo/Redo */}
        <div className="flex gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStackRef.current.length <= 1}
            className="px-2 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center shrink-0"
            title="Undo (Cmd/Ctrl+Z)"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStackRef.current.length === 0}
            className="px-2 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center shrink-0"
            title="Redo (Cmd/Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>

        <div className="w-px h-6 sm:h-5 bg-gray-300 dark:bg-gray-600 mx-0.5 shrink-0" />

        {/* Clear Button */}
        <button
          type="button"
          onClick={handleClear}
          className="px-2 py-1.5 text-xs border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900 active:bg-red-100 dark:active:bg-red-800 text-red-600 dark:text-red-400 font-medium min-h-[36px] sm:min-h-[32px] shrink-0 whitespace-nowrap"
          title="Clear all content"
        >
          Clear
        </button>

        <div className="w-px h-6 sm:h-5 bg-gray-300 dark:bg-gray-600 mx-0.5 shrink-0" />

        {/* Text Colors */}
        <div className="flex gap-0.5 shrink-0">
          {colorOptions.map((option) => {
            const displayColor = theme === 'dark' && option.value === '#000000' ? '#FFFFFF' : option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => applyTextColor(option.value)}
                className="px-1.5 py-1.5 text-xs border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
                title={option.label}
              >
                <span
                  className="text-lg"
                  style={{ color: displayColor }}
                >
                  A
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-px h-6 sm:h-5 bg-gray-300 dark:bg-gray-600 mx-0.5 shrink-0" />

        {/* Alignment */}
        <div className="flex gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'justifyLeft')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Align Left"
          >
            ⬅
          </button>
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'justifyCenter')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Align Center"
          >
            ⬌
          </button>
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'justifyRight')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Align Right"
          >
            ➡
          </button>
        </div>

        <div className="w-px h-6 sm:h-5 bg-gray-300 dark:bg-gray-600 mx-0.5 shrink-0" />

        {/* Lists */}
        <div className="flex gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'insertUnorderedList')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Bullet List"
          >
            •
          </button>
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'insertOrderedList')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Numbered List"
          >
            1.
          </button>
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'insertChecklist')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Checklist"
          >
            ☑
          </button>
        </div>

        <div className="w-px h-6 sm:h-5 bg-gray-300 dark:bg-gray-600 mx-0.5 shrink-0" />

        {/* Text Styles */}
        <div className="flex gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'bold')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 font-bold min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Bold (Cmd/Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'italic')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 italic min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Italic (Cmd/Ctrl+I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, 'underline')}
            className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 underline min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title="Underline (Cmd/Ctrl+U)"
          >
            U
          </button>
        </div>

        {/* Voice Input (mobile) */}
        {isSpeechSupported && (
          <>
            <div className="w-px h-6 sm:h-5 bg-gray-300 dark:bg-gray-600 mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={handleVoiceInput}
              className="px-1.5 py-1.5 text-sm border rounded hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
              title="Voice Input"
            >
              🎤
            </button>
          </>
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="flex-1 p-3 sm:p-4 md:p-6 focus:outline-none overflow-y-auto text-base sm:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
        style={{
          minHeight: '360px',
          maxHeight: editorMaxHeight,
        }}
        suppressContentEditableWarning
        data-placeholder="Start dumping your thoughts..."
      />

      {/* Footer with stats and save status */}
      <div className="flex justify-between items-center px-3 sm:px-4 md:px-6 py-2 border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        <div className="flex gap-3 sm:gap-4">
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          <span>{charCount} {charCount === 1 ? 'character' : 'characters'}</span>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-blue-500 dark:text-blue-400">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-500 dark:text-green-400">✓ Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}
