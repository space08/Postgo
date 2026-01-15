import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Tab } from '../types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  onCloseOtherTabs: (id: string) => void;
  onCloseRightTabs: (id: string) => void;
  onCloseLeftTabs: (id: string) => void;
  onCloseAllTabs: () => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
}

export default function TabBar({ 
  tabs, 
  activeTabId, 
  onTabClick, 
  onTabClose, 
  onNewTab,
  onCloseOtherTabs,
  onCloseRightTabs,
  onCloseLeftTabs,
  onCloseAllTabs,
  onTabReorder
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && onTabReorder) {
      onTabReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragEnd();
  };

  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto relative">
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          className={`
            flex items-center gap-2 px-4 py-2 border-r border-gray-700 cursor-move
            min-w-[150px] max-w-[200px] group relative select-none
            ${activeTabId === tab.id ? 'bg-gray-900' : 'bg-gray-800 hover:bg-gray-750'}
            ${draggedIndex === index ? 'opacity-50' : ''}
            ${dragOverIndex === index && draggedIndex !== index ? 'border-l-4 border-l-blue-500' : ''}
          `}
          onClick={() => onTabClick(tab.id)}
          onContextMenu={(e) => handleContextMenu(e, tab.id)}
        >
          <span className={`
            text-xs font-medium px-2 py-0.5 rounded
            ${tab.request.method === 'GET' ? 'bg-green-600/20 text-green-400' : ''}
            ${tab.request.method === 'POST' ? 'bg-blue-600/20 text-blue-400' : ''}
            ${tab.request.method === 'PUT' ? 'bg-yellow-600/20 text-yellow-400' : ''}
            ${tab.request.method === 'DELETE' ? 'bg-red-600/20 text-red-400' : ''}
            ${tab.request.method === 'PATCH' ? 'bg-purple-600/20 text-purple-400' : ''}
          `}>
            {tab.request.method}
          </span>
          <span className="truncate flex-1 text-sm text-gray-200">
            {tab.title || 'New Request'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className="opacity-0 group-hover:opacity-100 hover:bg-gray-600 rounded p-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={onNewTab}
        className="px-4 py-2 hover:bg-gray-700 text-gray-400 hover:text-white"
      >
        <Plus size={18} />
      </button>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded shadow-lg py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => {
              onTabClose(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => {
              onCloseOtherTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close Others
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => {
              onCloseRightTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close to the Right
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => {
              onCloseLeftTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close to the Left
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => {
              onCloseAllTabs();
              setContextMenu(null);
            }}
          >
            Close All
          </button>
        </div>
      )}
    </div>
  );
}
