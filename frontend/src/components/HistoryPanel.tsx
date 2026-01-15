import { Search, Clock, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { HistoryRecord, HttpRequest } from '../types';

interface HistoryPanelProps {
  history: HistoryRecord[];
  onSelectHistory: (request: HttpRequest) => void;
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
  onClose: () => void;
}

export default function HistoryPanel({
  history,
  onSelectHistory,
  onClearHistory,
  onDeleteRecord,
  onClose
}: HistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter((record) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.request.url.toLowerCase().includes(query) ||
      record.request.name.toLowerCase().includes(query) ||
      record.request.method.toLowerCase().includes(query)
    );
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 300 && status < 400) return 'text-yellow-500';
    if (status >= 400 && status < 500) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock size={20} />
            History
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onClearHistory}
          className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm flex items-center justify-center gap-2"
        >
          <Trash2 size={14} />
          Clear All History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No history records found
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredHistory.map((record) => (
              <div
                key={record.id}
                className="p-3 hover:bg-gray-800 cursor-pointer group"
                onClick={() => onSelectHistory(record.request)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`
                      text-xs font-medium px-2 py-0.5 rounded flex-shrink-0
                      ${record.request.method === 'GET' ? 'bg-green-600/20 text-green-400' : ''}
                      ${record.request.method === 'POST' ? 'bg-blue-600/20 text-blue-400' : ''}
                      ${record.request.method === 'PUT' ? 'bg-yellow-600/20 text-yellow-400' : ''}
                      ${record.request.method === 'DELETE' ? 'bg-red-600/20 text-red-400' : ''}
                    `}>
                      {record.request.method}
                    </span>
                    <span className={`text-sm font-medium ${getStatusColor(record.response.status)}`}>
                      {record.response.status}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRecord(record.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-sm text-gray-300 truncate mb-1">
                  {record.request.url}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatTimestamp(record.timestamp)}</span>
                  <span>{record.response.time}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
