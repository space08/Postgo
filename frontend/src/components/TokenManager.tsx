import { useState } from 'react';
import { Key, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Token } from '../types';
import { main } from '../../wailsjs/go/models';

interface TokenManagerProps {
  tokens: Token[];
  onSaveToken: (token: Token) => void;
  onDeleteToken: (tokenId: string) => void;
  onClose: () => void;
}

export default function TokenManager({
  tokens,
  onSaveToken,
  onDeleteToken,
  onClose,
}: TokenManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [tokenName, setTokenName] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [tokenHeaderKey, setTokenHeaderKey] = useState('Authorization');

  const handleSave = () => {
    if (tokenName.trim() && tokenValue.trim()) {
      const token = new main.Token({
        id: editingToken?.id || `token-${Date.now()}`,
        name: tokenName.trim(),
        value: tokenValue.trim(),
        headerKey: tokenHeaderKey.trim(),
      });
      onSaveToken(token);
      resetForm();
    }
  };

  const resetForm = () => {
    setTokenName('');
    setTokenValue('');
    setTokenHeaderKey('Authorization');
    setEditingToken(null);
    setShowDialog(false);
  };

  const startEdit = (token: Token) => {
    setEditingToken(token);
    setTokenName(token.name);
    setTokenValue(token.value);
    setTokenHeaderKey(token.headerKey);
    setShowDialog(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Key size={24} />
            Token Manager
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
            {tokens.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No tokens saved yet
              </div>
            ) : (
              tokens.map((token) => (
                <div
                  key={token.id}
                  className="bg-gray-700 rounded p-3 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{token.name}</div>
                    <div className="text-gray-400 text-sm mt-1">
                      Header: <span className="text-blue-400">{token.headerKey}</span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1 font-mono break-all">
                      {token.value.length > 50
                        ? token.value.substring(0, 50) + '...'
                        : token.value}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(token)}
                      className="text-blue-500 hover:text-blue-400 p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteToken(token.id)}
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
          Add New Token
        </button>

        {showDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-[500px]">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingToken ? 'Edit Token' : 'Add New Token'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Token Name
                  </label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g., Production API Token"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Header Key
                  </label>
                  <input
                    type="text"
                    value={tokenHeaderKey}
                    onChange={(e) => setTokenHeaderKey(e.target.value)}
                    placeholder="Authorization"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Token Value
                  </label>
                  <textarea
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                    placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
                  {editingToken ? 'Update' : 'Save'}
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
