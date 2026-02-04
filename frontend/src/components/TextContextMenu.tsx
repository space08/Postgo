import { useEffect, useRef, useState } from 'react';
import { Copy, Scissors, Clipboard, MousePointer } from 'lucide-react';

interface TextContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  targetElement: HTMLInputElement | HTMLTextAreaElement | HTMLPreElement | null;
}

export default function TextContextMenu({ x, y, onClose, targetElement }: TextContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [canCopy, setCanCopy] = useState(false);
  const [canCut, setCanCut] = useState(false);
  const [canPaste, setCanPaste] = useState(false);

  useEffect(() => {
    if (targetElement) {
      const isEditable = targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA';
      const isReadonly = 'readOnly' in targetElement && targetElement.readOnly;
      
      if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
        const hasSelection = (targetElement.selectionEnd || 0) > (targetElement.selectionStart || 0);
        setCanCopy(hasSelection);
        setCanCut(hasSelection && isEditable && !isReadonly);
      } else {
        const selection = window.getSelection();
        const hasSelection = selection && selection.toString().length > 0;
        setCanCopy(!!hasSelection);
        setCanCut(false);
      }
      
      setCanPaste(isEditable && !isReadonly);
    }
  }, [targetElement]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCopy = async () => {
    if (targetElement) {
      let textToCopy = '';
      
      if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
        const start = targetElement.selectionStart || 0;
        const end = targetElement.selectionEnd || 0;
        textToCopy = targetElement.value.substring(start, end);
      } else {
        const selection = window.getSelection();
        textToCopy = selection ? selection.toString() : '';
      }
      
      try {
        await navigator.clipboard.writeText(textToCopy);
        onClose();
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleCut = async () => {
    if (targetElement && (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement)) {
      const start = targetElement.selectionStart || 0;
      const end = targetElement.selectionEnd || 0;
      const textToCut = targetElement.value.substring(start, end);
      
      try {
        await navigator.clipboard.writeText(textToCut);
        targetElement.value = targetElement.value.substring(0, start) + targetElement.value.substring(end);
        targetElement.setSelectionRange(start, start);
        
        const event = new Event('input', { bubbles: true });
        targetElement.dispatchEvent(event);
        
        onClose();
      } catch (err) {
        console.error('Failed to cut:', err);
      }
    }
  };

  const handlePaste = async () => {
    if (targetElement && (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement)) {
      try {
        const text = await navigator.clipboard.readText();
        const start = targetElement.selectionStart || 0;
        const end = targetElement.selectionEnd || 0;
        
        targetElement.value = targetElement.value.substring(0, start) + text + targetElement.value.substring(end);
        targetElement.setSelectionRange(start + text.length, start + text.length);
        
        const event = new Event('input', { bubbles: true });
        targetElement.dispatchEvent(event);
        
        onClose();
      } catch (err) {
        console.error('Failed to paste:', err);
      }
    }
  };

  const handleSelectAll = () => {
    if (targetElement) {
      if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
        targetElement.select();
      } else {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(targetElement);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ top: y, left: x }}
    >
      <button
        onClick={handleCopy}
        disabled={!canCopy}
        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
          canCopy
            ? 'text-gray-200 hover:bg-gray-700'
            : 'text-gray-500 cursor-not-allowed'
        }`}
      >
        <Copy size={14} />
        Copy
      </button>
      <button
        onClick={handleCut}
        disabled={!canCut}
        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
          canCut
            ? 'text-gray-200 hover:bg-gray-700'
            : 'text-gray-500 cursor-not-allowed'
        }`}
      >
        <Scissors size={14} />
        Cut
      </button>
      <button
        onClick={handlePaste}
        disabled={!canPaste}
        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
          canPaste
            ? 'text-gray-200 hover:bg-gray-700'
            : 'text-gray-500 cursor-not-allowed'
        }`}
      >
        <Clipboard size={14} />
        Paste
      </button>
      <div className="border-t border-gray-700 my-1"></div>
      <button
        onClick={handleSelectAll}
        className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
      >
        <MousePointer size={14} />
        Select All
      </button>
    </div>
  );
}
