import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { HttpResponse } from '../types';

interface ResponseViewerProps {
  response?: HttpResponse;
  loading: boolean;
  error?: string;
}

type TabType = 'body' | 'headers' | 'cookies' | 'tests';
type ViewMode = 'formatted' | 'raw';

export default function ResponseViewer({ response, loading, error }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('body');
  const [viewMode, setViewMode] = useState<ViewMode>('formatted');
  
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
                <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-mono">Ctrl+S</kbd>
                <span className="text-gray-400 text-sm">Save request</span>
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
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };

  const parseCookies = (headers: Record<string, string>): Array<{name: string, value: string}> => {
    const cookies: Array<{name: string, value: string}> = [];
    const setCookieHeaders = Object.entries(headers)
      .filter(([key]) => key.toLowerCase() === 'set-cookie')
      .map(([, value]) => value);
    
    setCookieHeaders.forEach(cookieStr => {
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
            {response?.scriptResult && (
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'tests'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Tests
                {response.scriptResult.tests && response.scriptResult.tests.length > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                    response.scriptResult.tests.every(t => t.passed)
                      ? 'bg-green-600'
                      : 'bg-red-600'
                  }`}>
                    {response.scriptResult.tests.filter(t => t.passed).length}/{response.scriptResult.tests.length}
                  </span>
                )}
              </button>
            )}
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
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-y-auto">
          {activeTab === 'body' && (
            <pre className="bg-gray-800 p-4 rounded text-sm text-gray-200 overflow-x-auto">
              {formatBody(response.body)}
            </pre>
          )}

          {activeTab === 'headers' && (
            <div className="bg-gray-800 p-4 rounded">
              {Object.entries(response.headers || {}).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm mb-1">
                  <span className="text-blue-400 font-medium">{key}:</span>
                  <span className="text-gray-200">{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="bg-gray-800 p-4 rounded">
              {parseCookies(response.headers || {}).length > 0 ? (
                parseCookies(response.headers || {}).map((cookie, index) => (
                  <div key={index} className="flex gap-2 text-sm mb-2 pb-2 border-b border-gray-700 last:border-0">
                    <span className="text-purple-400 font-medium min-w-[120px]">{cookie.name}:</span>
                    <span className="text-gray-200 break-all">{cookie.value}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-4">No cookies in response</div>
              )}
            </div>
          )}

          {activeTab === 'tests' && response?.scriptResult && (
            <div className="space-y-4">
              {response.scriptResult.error && (
                <div className="bg-red-900/20 border border-red-700 rounded p-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="text-red-400 font-semibold mb-1">Script Error</h4>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{response.scriptResult.error}</pre>
                    </div>
                  </div>
                </div>
              )}

              {response.scriptResult.tests && response.scriptResult.tests.length > 0 && (
                <div className="bg-gray-800 p-4 rounded">
                  <h4 className="text-gray-300 font-semibold mb-3 flex items-center gap-2">
                    Test Results
                    <span className="text-xs text-gray-500">
                      ({response.scriptResult.tests.filter(t => t.passed).length} / {response.scriptResult.tests.length} passed)
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {response.scriptResult.tests.map((test, index) => (
                      <div key={index} className={`p-3 rounded border ${
                        test.passed 
                          ? 'bg-green-900/20 border-green-700' 
                          : 'bg-red-900/20 border-red-700'
                      }`}>
                        <div className="flex items-start gap-2">
                          {test.passed ? (
                            <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                          ) : (
                            <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                          )}
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${test.passed ? 'text-green-300' : 'text-red-300'}`}>
                              {test.name}
                            </div>
                            {test.error && (
                              <div className="mt-1 text-xs text-gray-400 font-mono">
                                {test.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {response.scriptResult.consoleOutput && response.scriptResult.consoleOutput.length > 0 && (
                <div className="bg-gray-800 p-4 rounded">
                  <h4 className="text-gray-300 font-semibold mb-3">Console Output</h4>
                  <div className="bg-gray-900 p-3 rounded font-mono text-xs text-gray-300 space-y-1">
                    {response.scriptResult.consoleOutput.map((output, index) => (
                      <div key={index} className="border-b border-gray-700 last:border-0 pb-1 last:pb-0">
                        {output}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!response.scriptResult.tests?.length && !response.scriptResult.consoleOutput?.length && !response.scriptResult.error && (
                <div className="text-gray-500 text-center py-8">
                  No test results or console output
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
