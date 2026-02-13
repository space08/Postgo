import { useState } from 'react';
import { AlertCircle, Copy, Check, Save, Download } from 'lucide-react';
import { HttpResponse, Header } from '../types';
import { main } from '../../wailsjs/go/models';

interface ResponseViewerProps {
  response?: HttpResponse;
  loading: boolean;
  error?: string;
  onSaveHeader?: (header: Header) => void;
}

type TabType = 'body' | 'headers' | 'cookies';
type ViewMode = 'formatted' | 'raw' | 'preview';

export default function ResponseViewer({ response, loading, error, onSaveHeader }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('body');
  const [viewMode, setViewMode] = useState<ViewMode>('formatted');
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveHeaderName, setSaveHeaderName] = useState('');
  const [saveHeaderKey, setSaveHeaderKey] = useState('');
  const [saveHeaderValue, setSaveHeaderValue] = useState('');
  const [showExtractDialog, setShowExtractDialog] = useState(false);
  const [extractPath, setExtractPath] = useState('access_token');
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-gray-400">Sending request...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="max-w-md">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="text-red-400 font-semibold mb-2">请求失败</h3>
                <p className="text-gray-300 text-sm break-words whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-500 text-xs">
            <p>请检查网络连接、URL格式是否正确，或查看控制台了解详细错误信息</p>
          </div>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          {/* <div className="text-gray-500 text-sm mb-4">No response yet</div> */}
          <div className=" rounded-lg p-6 inline-block">
            {/* <div className="text-gray-300 font-semibold mb-3">Keyboard Shortcuts</div> */}
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-4">
                <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-mono">Ctrl+Enter</kbd>
                <span className="text-gray-400 text-sm">Send request</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-mono">Ctrl+W</kbd>
                <span className="text-gray-400 text-sm">Close current tab</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-mono">Ctrl+T</kbd>
                <span className="text-gray-400 text-sm">New tab</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatBody = (body: string) => {
    if (viewMode === 'raw') return body;
    
    // Try JSON formatting first
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, try HTML formatting
      if (body.trim().startsWith('<')) {
        return body
          .replace(/></g, '>\n<')
          .replace(/(<[^>]+>)([^<]+)/g, '$1\n  $2')
          .replace(/\n\s*\n/g, '\n')
          .trim();
      }
      return body;
    }
  };

  const handleCopy = async () => {
    if (!response) return;
    
    const contentToCopy = viewMode === 'preview' 
      ? response.body 
      : formatBody(response.body);
    
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSaveHeader = (headerKey: string, headerValue: string, suggestedName?: string) => {
    // Validate that headerValue is not empty or undefined
    if (!headerValue || headerValue === 'undefined' || headerValue === 'null' || headerValue.trim() === '') {
      console.warn('Cannot save header with empty or invalid value');
      return;
    }
    setSaveHeaderKey(headerKey);
    setSaveHeaderValue(headerValue);
    setSaveHeaderName(suggestedName || headerKey);
    setShowSaveDialog(true);
  };

  const confirmSaveHeader = () => {
    if (onSaveHeader && saveHeaderName.trim() && saveHeaderKey.trim() && saveHeaderValue.trim()) {
      const header = new main.Header({
        id: `header-${Date.now()}`,
        name: saveHeaderName.trim(),
        headerKey: saveHeaderKey.trim(),
        value: saveHeaderValue.trim(),
      });
      onSaveHeader(header);
      setShowSaveDialog(false);
      setSaveHeaderName('');
      setSaveHeaderKey('');
      setSaveHeaderValue('');
    }
  };

  const extractValueFromJSON = (obj: any, path: string): any => {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    return value;
  };

  const handleExtractToken = () => {
    if (!response || !extractPath.trim()) return;
    
    try {
      const jsonData = JSON.parse(response.body);
      const value = extractValueFromJSON(jsonData, extractPath.trim());
      
      if (value) {
        const tokenValue = typeof value === 'string' ? value : JSON.stringify(value);
        handleSaveHeader('Authorization', `Bearer ${tokenValue}`, 'Extracted Token');
        setShowExtractDialog(false);
      } else {
        alert(`Path "${extractPath}" not found in response`);
      }
    } catch (err) {
      alert('Failed to parse JSON or extract value');
    }
  };

  const parseCookies = (headers: Record<string, string>): Array<{name: string, value: string}> => {
    const cookies: Array<{name: string, value: string}> = [];
    const setCookieHeader = Object.entries(headers)
      .find(([key]) => key.toLowerCase() === 'set-cookie')?.[1];
    
    if (!setCookieHeader) return cookies;
    
    const cookieLines = setCookieHeader.split('\n');
    
    cookieLines.forEach(cookieStr => {
      const parts = cookieStr.split(';')[0].split('=');
      if (parts.length >= 2) {
        cookies.push({ 
          name: parts[0].trim(), 
          value: parts.slice(1).join('=').trim() 
        });
      }
    });
    
    return cookies;
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 300 && status < 400) return 'text-yellow-500';
    if (status >= 400 && status < 500) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-gray-400 text-sm mr-2">Status:</span>
            <span className={`font-semibold ${getStatusColor(response.status)}`}>
              {response.statusText}
            </span>
          </div>
          <div>
            <span className="text-gray-400 text-sm mr-2">Time:</span>
            <span className="text-white">{response.time}ms</span>
          </div>
          <div>
            <span className="text-gray-400 text-sm mr-2">Size:</span>
            <span className="text-white">{response.size} bytes</span>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-700">
        <div className="flex justify-between items-center px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('body')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'body'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Body
            </button>
            <button
              onClick={() => setActiveTab('headers')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'headers'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Headers
            </button>
            <button
              onClick={() => setActiveTab('cookies')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cookies'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Cookies
            </button>
          </div>
          {activeTab === 'body' && (
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('formatted')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'formatted'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Formatted
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'raw'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Raw
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'preview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Preview
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs rounded bg-gray-700 text-gray-400 hover:bg-gray-600 flex items-center gap-1.5 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              {(() => {
                try {
                  JSON.parse(response?.body || '');
                  return (
                    <button
                      onClick={() => setShowExtractDialog(true)}
                      className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1.5"
                      title="Extract token from JSON"
                    >
                      <Download size={14} />
                      <span>Extract</span>
                    </button>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-y-auto">
          {activeTab === 'body' && (
            viewMode === 'preview' ? (
              <div className="bg-gray-800 rounded h-full min-h-[300px]">
                <iframe
                  className="w-full h-[60vh] bg-white rounded"
                  sandbox=""
                  srcDoc={response.body}
                />
              </div>
            ) : (
              <pre className="bg-gray-800 p-4 rounded text-sm text-gray-200 overflow-x-auto">
                {formatBody(response.body)}
              </pre>
            )
          )}

          {activeTab === 'headers' && (
            <div className="bg-gray-800 p-4 rounded">
              {Object.entries(response.headers || {}).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm mb-2 pb-2 border-b border-gray-700 last:border-0 items-start">
                  <span className="text-blue-400 font-medium min-w-[150px]">{key}:</span>
                  <span className="text-gray-200 flex-1 break-all">{String(value)}</span>
                  {onSaveHeader && (
                    <button
                      onClick={() => handleSaveHeader(key, String(value))}
                      className="text-green-500 hover:text-green-400 p-1 flex-shrink-0"
                      title="Save as header preset"
                    >
                      <Save size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="bg-gray-800 p-4 rounded">
              {parseCookies(response.headers || {}).length > 0 ? (
                <>
                  <div className="mb-4 pb-2 border-b border-gray-600">
                    {onSaveHeader && (
                      <button
                        onClick={() => {
                          const allCookies = parseCookies(response.headers || {})
                            .map(c => `${c.name}=${c.value}`)
                            .join('; ');
                          if (allCookies && allCookies.trim()) {
                            handleSaveHeader('Cookie', allCookies, 'Response Cookies');
                          }
                        }}
                        className="text-green-500 hover:text-green-400 text-sm flex items-center gap-2"
                      >
                        <Save size={16} />
                        <span>Save All Cookies</span>
                      </button>
                    )}
                  </div>
                  {parseCookies(response.headers || {}).map((cookie, index) => (
                    <div key={index} className="flex gap-2 text-sm mb-2 pb-2 border-b border-gray-700 last:border-0">
                      <span className="text-purple-400 font-medium min-w-[120px]">{cookie.name}:</span>
                      <span className="text-gray-200 break-all flex-1">{cookie.value}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-gray-500 text-center py-4">No cookies in response</div>
              )}
            </div>
          )}
        </div>
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold text-white mb-4">Save Header</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={saveHeaderName}
                  onChange={(e) => setSaveHeaderName(e.target.value)}
                  placeholder="e.g., Session Cookie"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Header Key</label>
                <input
                  type="text"
                  value={saveHeaderKey}
                  onChange={(e) => setSaveHeaderKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Value</label>
                <textarea
                  value={saveHeaderValue}
                  onChange={(e) => setSaveHeaderValue(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm resize-none"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmSaveHeader}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showExtractDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold text-white mb-4">Extract Token from JSON</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  JSON Path (dot notation)
                </label>
                <input
                  type="text"
                  value={extractPath}
                  onChange={(e) => setExtractPath(e.target.value)}
                  placeholder="e.g., data.access_token or token"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Examples: "access_token", "data.token", "response.auth.token"
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleExtractToken}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
              >
                Extract
              </button>
              <button
                onClick={() => setShowExtractDialog(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
