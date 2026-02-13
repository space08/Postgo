import { useState } from 'react';
import { List, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Header } from '../types';
import { main } from '../../wailsjs/go/models';

interface HeaderManagerProps {
  headers: Header[];
  onSaveHeader: (header: Header) => void;
  onDeleteHeader: (headerId: string) => void;
  onClose: () => void;
}

export default function HeaderManager({
  headers,
  onSaveHeader,
  onDeleteHeader,
  onClose,
}: HeaderManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingHeader, setEditingHeader] = useState<Header | null>(null);
  const [headerName, setHeaderName] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [headerKey, setHeaderKey] = useState('Authorization');

  const handleSave = () => {
    if (headerName.trim() && headerValue.trim()) {
      const header = new main.Header({
        id: editingHeader?.id || `header-${Date.now()}`,
        name: headerName.trim(),
        value: headerValue.trim(),
        headerKey: headerKey.trim(),
      });
      onSaveHeader(header);
      resetForm();
    }
  };

  const resetForm = () => {
    setHeaderName('');
    setHeaderValue('');
    setHeaderKey('Authorization');
    setEditingHeader(null);
    setShowDialog(false);
  };

  const startEdit = (header: Header) => {
    setEditingHeader(header);
    setHeaderName(header.name);
    setHeaderValue(header.value);
    setHeaderKey(header.headerKey);
    setShowDialog(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <List size={24} />
            Header Manager
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-2">
            {headers.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No headers saved yet
              </div>
            ) : (
              headers.map((header) => (
                <div
                  key={header.id}
                  className="bg-gray-700 rounded p-3 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{header.name}</div>
                    <div className="text-gray-400 text-sm mt-1">
                      Header: <span className="text-blue-400">{header.headerKey}</span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1 font-mono break-all">
                      {header.value.length > 50
                        ? header.value.substring(0, 50) + '...'
                        : header.value}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(header)}
                      className="text-blue-500 hover:text-blue-400 p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteHeader(header.id)}
                      className="text-red-500 hover:text-red-400 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => setShowDialog(true)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add New Header
        </button>

        {showDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-[500px]">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingHeader ? 'Edit Header' : 'Add New Header'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Header Name
                  </label>
                  <input
                    type="text"
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                    placeholder="e.g., Production Auth Token"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Header Key
                  </label>
                  <input
                    type="text"
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    placeholder="Authorization, Cookie, X-API-Key, etc."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Header Value
                  </label>
                  <textarea
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    placeholder="Bearer token, session=abc; user=xyz, or any header value"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm resize-none"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  {editingHeader ? 'Update' : 'Save'}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
