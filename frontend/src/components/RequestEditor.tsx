import { Send, Plus, Trash2, Key, Save } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { HttpRequest, HttpMethod, KeyValue, Token } from '../types';
import { main } from '../../wailsjs/go/models';
import { StartOAuth2Flow, ExchangeOAuth2Code, GetOAuth2ClientCredentialsToken, GetOAuth2PasswordToken, RefreshOAuth2Token } from '../../wailsjs/go/main/App';

interface RequestEditorProps {
  request: HttpRequest;
  onRequestChange: (request: HttpRequest) => void;
  onSend: () => void;
  onSave?: () => void;
  tokens?: Token[];
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const COMMON_HEADERS = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Encoding',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Date',
  'Expect',
  'Forwarded',
  'From',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Max-Forwards',
  'Origin',
  'Pragma',
  'Proxy-Authorization',
  'Range',
  'Referer',
  'TE',
  'User-Agent',
  'Upgrade',
  'Via',
  'Warning',
];

type RequestTabType = 'params' | 'headers' | 'body' | 'auth' | 'scripts';

export default function RequestEditor({ request, onRequestChange, onSend, onSave, tokens = [] }: RequestEditorProps) {
  const [activeTab, setActiveTab] = useState<RequestTabType>('params');
  const [headerSuggestions, setHeaderSuggestions] = useState<string[]>([]);
  const [activeHeaderIndex, setActiveHeaderIndex] = useState<number>(-1);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(0);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'body' && 
        request.method !== 'POST' && 
        request.method !== 'PUT' && 
        request.method !== 'PATCH') {
      setActiveTab('params');
    }
  }, [request.method, activeTab]);
  const updateHeaders = (headers: KeyValue[]) => {
    const updated = new main.HttpRequest(request);
    updated.headers = headers;
    onRequestChange(updated);
  };

  const updateParams = (params: KeyValue[]) => {
    const updated = new main.HttpRequest(request);
    updated.params = params;
    onRequestChange(updated);
  };

  const addHeader = () => {
    updateHeaders([...request.headers, new main.KeyValue({ key: '', value: '', enabled: true })]);
  };

  const removeHeader = (index: number) => {
    updateHeaders(request.headers.filter((_: any, i: number) => i !== index));
  };

  const deleteAllHeaders = () => {
    updateHeaders([]);
  };

  const insertToken = (token: Token) => {
    const existingIndex = request.headers.findIndex(h => h.key === token.headerKey);
    
    if (existingIndex >= 0) {
      const newHeaders = [...request.headers];
      newHeaders[existingIndex].value = token.value;
      newHeaders[existingIndex].enabled = true;
      updateHeaders(newHeaders);
    } else {
      updateHeaders([...request.headers, new main.KeyValue({ 
        key: token.headerKey, 
        value: token.value, 
        enabled: true 
      })]);
    }
  };

  const addParam = () => {
    updateParams([...request.params, new main.KeyValue({ key: '', value: '', enabled: true })]);
  };

  const removeParam = (index: number) => {
    updateParams(request.params.filter((_: any, i: number) => i !== index));
  };

  const deleteAllParams = () => {
    updateParams([]);
  };

  const handleHeaderKeyChange = (index: number, value: string) => {
    const newHeaders = [...request.headers];
    newHeaders[index].key = value;
    updateHeaders(newHeaders);

    if (value.trim()) {
      const filtered = COMMON_HEADERS.filter(h => 
        h.toLowerCase().startsWith(value.toLowerCase())
      );
      setHeaderSuggestions(filtered);
      setActiveHeaderIndex(index);
      setSelectedSuggestionIndex(0);
    } else {
      setHeaderSuggestions([]);
      setActiveHeaderIndex(-1);
    }
  };

  const selectHeaderSuggestion = (index: number, suggestion: string) => {
    const newHeaders = [...request.headers];
    newHeaders[index].key = suggestion;
    updateHeaders(newHeaders);
    setHeaderSuggestions([]);
    setActiveHeaderIndex(-1);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (headerSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < headerSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : headerSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectHeaderSuggestion(index, headerSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setHeaderSuggestions([]);
      setActiveHeaderIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setHeaderSuggestions([]);
        setActiveHeaderIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onSend();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave && request.projectId) {
          onSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSend, onSave, request.projectId]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 border-b border-gray-700">
        <div className="flex gap-2">
          <select
            value={request.method}
            onChange={(e) => {
              const updated = new main.HttpRequest(request);
              updated.method = e.target.value;
              onRequestChange(updated);
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          <input
            type="text"
            value={request.url}
            onChange={(e) => {
              const updated = new main.HttpRequest(request);
              updated.url = e.target.value;
              onRequestChange(updated);
            }}
            placeholder="Enter request URL"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onSend}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
          >
            <Send size={18} />
            Send
          </button>
          {onSave && request.projectId && (
            <button
              onClick={onSave}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-2"
            >
              <Save size={18} />
              Save
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-700">
        <div className="flex gap-1 px-4">
          <button
            onClick={() => setActiveTab('params')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'params'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Params
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
          {(request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') && (
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
          )}
          <button
            onClick={() => setActiveTab('auth')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'auth'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Auth
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'scripts'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Scripts
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-y-auto">
          {activeTab === 'params' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">Query Parameters</h3>
                <div className="flex gap-2">
                  <button
                    onClick={addParam}
                    className="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                  {request.params.length > 0 && (
                    <button
                      onClick={deleteAllParams}
                      className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1"
                    >
                      <Trash2 size={16} />
                      Delete All
                    </button>
                  )}
                </div>
              </div>
            <div className="space-y-2">
              {request.params.map((param: any, index: number) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={(e) => {
                      const newParams = [...request.params];
                      newParams[index].enabled = e.target.checked;
                      updateParams(newParams);
                    }}
                    className="w-4 h-4"
                  />
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => {
                      const newParams = [...request.params];
                      newParams[index].key = e.target.value;
                      updateParams(newParams);
                    }}
                    placeholder="Key"
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => {
                      const newParams = [...request.params];
                      newParams[index].value = e.target.value;
                      updateParams(newParams);
                    }}
                    placeholder="Value"
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  />
                  <button
                    onClick={() => removeParam(index)}
                    className="text-red-500 hover:text-red-400 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            </div>
          )}

          {activeTab === 'headers' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">Request Headers</h3>
                <div className="flex gap-2">
                  {tokens.length > 0 && (
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            const token = tokens.find(t => t.id === e.target.value);
                            if (token) {
                              insertToken(token);
                              e.target.value = '';
                            }
                          }
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded flex items-center gap-1 cursor-pointer"
                      >
                        <option value="">Insert Token</option>
                        {tokens.map((token) => (
                          <option key={token.id} value={token.id}>
                            {token.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={addHeader}
                    className="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                  {request.headers.length > 0 && (
                    <button
                      onClick={deleteAllHeaders}
                      className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1"
                    >
                      <Trash2 size={16} />
                      Delete All
                    </button>
                  )}
                </div>
              </div>
            <div className="space-y-2">
              {request.headers.map((header: any, index: number) => (
                <div key={index} className="flex gap-2 items-center relative">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => {
                      const newHeaders = [...request.headers];
                      newHeaders[index].enabled = e.target.checked;
                      updateHeaders(newHeaders);
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => handleHeaderKeyChange(index, e.target.value)}
                      onKeyDown={(e) => handleHeaderKeyDown(e, index)}
                      placeholder="Key"
                      className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                    {activeHeaderIndex === index && headerSuggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto"
                      >
                        {headerSuggestions.map((suggestion, sugIndex) => (
                          <div
                            key={suggestion}
                            onClick={() => selectHeaderSuggestion(index, suggestion)}
                            className={`px-3 py-2 cursor-pointer text-sm ${
                              sugIndex === selectedSuggestionIndex
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => {
                      const newHeaders = [...request.headers];
                      newHeaders[index].value = e.target.value;
                      updateHeaders(newHeaders);
                    }}
                    placeholder="Value"
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  />
                  <button
                    onClick={() => removeHeader(index)}
                    className="text-red-500 hover:text-red-400 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            </div>
          )}

          {activeTab === 'body' && (
            <div>
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {['none', 'form-data', 'x-www-form-urlencoded', 'json', 'xml', 'raw'].map((type) => (
                    <label
                      key={type}
                      className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                        (request.body?.type || 'none') === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bodyType"
                        value={type}
                        checked={(request.body?.type || 'none') === type}
                        onChange={(e) => {
                          const updated = new main.HttpRequest(request);
                          updated.body = new main.RequestBody({ 
                            type: e.target.value,
                            content: '',
                            formData: []
                          });
                          onRequestChange(updated);
                        }}
                        className="sr-only"
                      />
                      {type === 'x-www-form-urlencoded' ? 'form-urlencoded' : type}
                    </label>
                  ))}
                </div>
              </div>

              {request.body?.type === 'none' && (
                <div className="text-gray-500 text-sm">No body for this request</div>
              )}

              {(request.body?.type === 'form-data' || request.body?.type === 'x-www-form-urlencoded') && (
                <div>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => {
                        const updated = new main.HttpRequest(request);
                        const currentFormData = updated.body?.formData || [];
                        updated.body = new main.RequestBody({
                          type: updated.body?.type || 'form-data',
                          formData: [...currentFormData, new main.KeyValue({ key: '', value: '', enabled: true })]
                        });
                        onRequestChange(updated);
                      }}
                      className="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Field
                    </button>
                    {(request.body?.formData || []).length > 0 && (
                      <button
                        onClick={() => {
                          const updated = new main.HttpRequest(request);
                          updated.body = new main.RequestBody({
                            type: updated.body?.type || 'form-data',
                            formData: []
                          });
                          onRequestChange(updated);
                        }}
                        className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        Delete All
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(request.body?.formData || []).map((field: any, index: number) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={(e) => {
                            const updated = new main.HttpRequest(request);
                            const formData = [...(updated.body?.formData || [])];
                            formData[index].enabled = e.target.checked;
                            updated.body = new main.RequestBody({
                              type: updated.body?.type || 'form-data',
                              formData
                            });
                            onRequestChange(updated);
                          }}
                          className="w-4 h-4"
                        />
                        <input
                          type="text"
                          value={field.key}
                          onChange={(e) => {
                            const updated = new main.HttpRequest(request);
                            const formData = [...(updated.body?.formData || [])];
                            formData[index].key = e.target.value;
                            updated.body = new main.RequestBody({
                              type: updated.body?.type || 'form-data',
                              formData
                            });
                            onRequestChange(updated);
                          }}
                          placeholder="Key"
                          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => {
                            const updated = new main.HttpRequest(request);
                            const formData = [...(updated.body?.formData || [])];
                            formData[index].value = e.target.value;
                            updated.body = new main.RequestBody({
                              type: updated.body?.type || 'form-data',
                              formData
                            });
                            onRequestChange(updated);
                          }}
                          placeholder="Value"
                          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                        <button
                          onClick={() => {
                            const updated = new main.HttpRequest(request);
                            const formData = (updated.body?.formData || []).filter((_: any, i: number) => i !== index);
                            updated.body = new main.RequestBody({
                              type: updated.body?.type || 'form-data',
                              formData
                            });
                            onRequestChange(updated);
                          }}
                          className="text-red-500 hover:text-red-400 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(request.body?.type === 'json' || request.body?.type === 'xml' || request.body?.type === 'raw') && (
                <textarea
                  value={request.body?.content || ''}
                  onChange={(e) => {
                    const updated = new main.HttpRequest(request);
                    updated.body = new main.RequestBody({ 
                      type: updated.body?.type || 'json',
                      content: e.target.value 
                    });
                    onRequestChange(updated);
                  }}
                  placeholder={
                    request.body?.type === 'json' ? '{"key": "value"}' :
                    request.body?.type === 'xml' ? '<root></root>' :
                    'Raw text content'
                  }
                  className="w-full h-64 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm resize-none"
                />
              )}
            </div>
          )}

          {activeTab === 'auth' && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-4">Authorization</h3>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Type</label>
                <select
                  value={request.auth?.type || 'none'}
                  onChange={(e) => {
                    const updated = new main.HttpRequest(request);
                    if (e.target.value === 'none') {
                      updated.auth = undefined;
                    } else {
                      updated.auth = new main.Auth({
                        type: e.target.value,
                        username: '',
                        password: '',
                        token: ''
                      });
                    }
                    onRequestChange(updated);
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No Auth</option>
                  <option value="basic">Basic Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="oauth2">OAuth 2.0</option>
                </select>
              </div>

              {request.auth?.type === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={request.auth.username || ''}
                      onChange={(e) => {
                        const updated = new main.HttpRequest(request);
                        updated.auth = new main.Auth({
                          type: 'basic',
                          username: e.target.value,
                          password: updated.auth?.password || '',
                          token: ''
                        });
                        onRequestChange(updated);
                      }}
                      placeholder="Enter username"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Password</label>
                    <input
                      type="password"
                      value={request.auth.password || ''}
                      onChange={(e) => {
                        const updated = new main.HttpRequest(request);
                        updated.auth = new main.Auth({
                          type: 'basic',
                          username: updated.auth?.username || '',
                          password: e.target.value,
                          token: ''
                        });
                        onRequestChange(updated);
                      }}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {request.auth?.type === 'bearer' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Token</label>
                  <textarea
                    value={request.auth.token || ''}
                    onChange={(e) => {
                      const updated = new main.HttpRequest(request);
                      updated.auth = new main.Auth({
                        type: 'bearer',
                        username: '',
                        password: '',
                        token: e.target.value
                      });
                      onRequestChange(updated);
                    }}
                    placeholder="Enter bearer token"
                    className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {request.auth?.type === 'oauth2' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Grant Type</label>
                    <select
                      value={request.auth.oauth2GrantType || 'authorization_code'}
                      onChange={(e) => {
                        const updated = new main.HttpRequest(request);
                        updated.auth = new main.Auth({
                          ...updated.auth,
                          type: 'oauth2',
                          oauth2GrantType: e.target.value
                        });
                        onRequestChange(updated);
                      }}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="authorization_code">Authorization Code</option>
                      <option value="client_credentials">Client Credentials</option>
                      <option value="password">Password</option>
                    </select>
                  </div>

                  {request.auth.oauth2GrantType === 'authorization_code' && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Authorization URL</label>
                      <input
                        type="text"
                        value={request.auth.oauth2AuthUrl || ''}
                        onChange={(e) => {
                          const updated = new main.HttpRequest(request);
                          updated.auth = new main.Auth({
                            ...updated.auth,
                            oauth2AuthUrl: e.target.value
                          });
                          onRequestChange(updated);
                        }}
                        placeholder="https://example.com/oauth/authorize"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token URL</label>
                    <input
                      type="text"
                      value={request.auth.oauth2TokenUrl || ''}
                      onChange={(e) => {
                        const updated = new main.HttpRequest(request);
                        updated.auth = new main.Auth({
                          ...updated.auth,
                          oauth2TokenUrl: e.target.value
                        });
                        onRequestChange(updated);
                      }}
                      placeholder="https://example.com/oauth/token"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Client ID</label>
                    <input
                      type="text"
                      value={request.auth.oauth2ClientId || ''}
                      onChange={(e) => {
                        const updated = new main.HttpRequest(request);
                        updated.auth = new main.Auth({
                          ...updated.auth,
                          oauth2ClientId: e.target.value
                        });
                        onRequestChange(updated);
                      }}
                      placeholder="Your client ID"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Client Secret</label>
                    <input
                      type="password"
                      value={request.auth.oauth2ClientSecret || ''}
                      onChange={(e) => {
                        const updated = new main.HttpRequest(request);
                        updated.auth = new main.Auth({
                          ...updated.auth,
                          oauth2ClientSecret: e.target.value
                        });
                        onRequestChange(updated);
                      }}
                      placeholder="Your client secret"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Scope (optional)</label>
                    <input
                      type="text"
                      value={request.auth.oauth2Scope || ''}
                      onChange={(e) => {
                        const updated = new main.HttpRequest(request);
                        updated.auth = new main.Auth({
                          ...updated.auth,
                          oauth2Scope: e.target.value
                        });
                        onRequestChange(updated);
                      }}
                      placeholder="read write"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {request.auth.oauth2GrantType === 'authorization_code' && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Redirect URL (optional)</label>
                      <input
                        type="text"
                        value={request.auth.oauth2RedirectUrl || ''}
                        onChange={(e) => {
                          const updated = new main.HttpRequest(request);
                          updated.auth = new main.Auth({
                            ...updated.auth,
                            oauth2RedirectUrl: e.target.value
                          });
                          onRequestChange(updated);
                        }}
                        placeholder="http://localhost:8080/callback"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {request.auth.oauth2GrantType === 'authorization_code' && (
                    <div>
                      <button
                        onClick={async () => {
                          try {
                            await StartOAuth2Flow(request.auth!);
                            alert('请在浏览器中完成授权，然后在下方输入授权码');
                          } catch (err: any) {
                            alert('启动OAuth 2.0流程失败: ' + err);
                          }
                        }}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        开始授权
                      </button>
                    </div>
                  )}

                  {request.auth.oauth2GrantType === 'authorization_code' && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Authorization Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="oauth2-code-input"
                          placeholder="粘贴授权码"
                          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById('oauth2-code-input') as HTMLInputElement;
                            const code = input.value;
                            if (!code) {
                              alert('请输入授权码');
                              return;
                            }
                            try {
                              const updatedAuth = await ExchangeOAuth2Code(request.auth!, code);
                              const updated = new main.HttpRequest(request);
                              updated.auth = new main.Auth(updatedAuth);
                              onRequestChange(updated);
                              input.value = '';
                              alert('获取令牌成功！');
                            } catch (err: any) {
                              alert('交换令牌失败: ' + err);
                            }
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          获取令牌
                        </button>
                      </div>
                    </div>
                  )}

                  {request.auth.oauth2GrantType === 'client_credentials' && (
                    <div>
                      <button
                        onClick={async () => {
                          try {
                            const updatedAuth = await GetOAuth2ClientCredentialsToken(request.auth!);
                            const updated = new main.HttpRequest(request);
                            updated.auth = new main.Auth(updatedAuth);
                            onRequestChange(updated);
                            alert('获取令牌成功！');
                          } catch (err: any) {
                            alert('获取令牌失败: ' + err);
                          }
                        }}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        获取令牌
                      </button>
                    </div>
                  )}

                  {request.auth.oauth2GrantType === 'password' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Resource Owner Username</label>
                        <input
                          type="text"
                          id="oauth2-username-input"
                          placeholder="Username"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Resource Owner Password</label>
                        <input
                          type="password"
                          id="oauth2-password-input"
                          placeholder="Password"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          const usernameInput = document.getElementById('oauth2-username-input') as HTMLInputElement;
                          const passwordInput = document.getElementById('oauth2-password-input') as HTMLInputElement;
                          const username = usernameInput.value;
                          const password = passwordInput.value;
                          if (!username || !password) {
                            alert('请输入用户名和密码');
                            return;
                          }
                          try {
                            const updatedAuth = await GetOAuth2PasswordToken(request.auth!, username, password);
                            const updated = new main.HttpRequest(request);
                            updated.auth = new main.Auth(updatedAuth);
                            onRequestChange(updated);
                            alert('获取令牌成功！');
                          } catch (err: any) {
                            alert('获取令牌失败: ' + err);
                          }
                        }}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        获取令牌
                      </button>
                    </div>
                  )}

                  {request.auth.oauth2AccessToken && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Access Token</label>
                      <div className="relative">
                        <textarea
                          value={request.auth.oauth2AccessToken}
                          readOnly
                          className="w-full h-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-green-400 font-mono text-xs resize-none"
                        />
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">已获取</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {request.auth.oauth2RefreshToken && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Refresh Token</label>
                      <div className="flex gap-2">
                        <textarea
                          value={request.auth.oauth2RefreshToken}
                          readOnly
                          className="flex-1 h-20 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-400 font-mono text-xs resize-none"
                        />
                        <button
                          onClick={async () => {
                            try {
                              const updatedAuth = await RefreshOAuth2Token(request.auth!);
                              const updated = new main.HttpRequest(request);
                              updated.auth = new main.Auth(updatedAuth);
                              onRequestChange(updated);
                              alert('刷新令牌成功！');
                            } catch (err: any) {
                              alert('刷新令牌失败: ' + err);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          刷新
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {request.auth?.type === 'none' && (
                <div className="text-gray-500 text-sm">
                  This request does not use any authorization.
                </div>
              )}
            </div>
          )}

          {activeTab === 'scripts' && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-4">Scripts</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-gray-400">Pre-request Script</label>
                    <span className="text-xs text-gray-500">Executed before sending the request</span>
                  </div>
                  <textarea
                    value={request.scripts?.preRequest || ''}
                    onChange={(e) => {
                      const updated = new main.HttpRequest(request);
                      if (!updated.scripts) {
                        updated.scripts = new main.Scripts({
                          preRequest: e.target.value,
                          postRequest: ''
                        });
                      } else {
                        updated.scripts = new main.Scripts({
                          preRequest: e.target.value,
                          postRequest: updated.scripts.postRequest || ''
                        });
                      }
                      onRequestChange(updated);
                    }}
                    placeholder={`// Example: Set environment variable\npm.environment.set("token", "abc123");\n\n// Available APIs:\n// - pm.environment.get/set\n// - pm.request\n// - console.log`}
                    className="w-full h-48 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-gray-400">Post-request Script (Tests)</label>
                    <span className="text-xs text-gray-500">Executed after receiving the response</span>
                  </div>
                  <textarea
                    value={request.scripts?.postRequest || ''}
                    onChange={(e) => {
                      const updated = new main.HttpRequest(request);
                      if (!updated.scripts) {
                        updated.scripts = new main.Scripts({
                          preRequest: '',
                          postRequest: e.target.value
                        });
                      } else {
                        updated.scripts = new main.Scripts({
                          preRequest: updated.scripts.preRequest || '',
                          postRequest: e.target.value
                        });
                      }
                      onRequestChange(updated);
                    }}
                    placeholder={`// Example: Test response status\npm.test("Status is 200", function() {\n  expect(pm.response).to.have.status(200);\n});\n\n// Extract and save token\nconst data = pm.response.json();\npm.environment.set("authToken", data.token);\n\n// Available APIs:\n// - pm.test\n// - pm.response\n// - pm.environment.get/set\n// - expect\n// - console.log`}
                    className="w-full h-48 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded text-sm text-gray-300">
                <p className="mb-2"><strong>Postman-like Script API:</strong></p>
                <ul className="space-y-1 ml-4 list-disc text-xs text-gray-400">
                  <li><code>pm.environment.get(key)</code> / <code>pm.environment.set(key, value)</code></li>
                  <li><code>pm.request.url</code>, <code>pm.request.method</code>, <code>pm.request.headers</code></li>
                  <li><code>pm.response.code</code>, <code>pm.response.status</code>, <code>pm.response.json()</code></li>
                  <li><code>pm.test(name, function)</code> - Define a test</li>
                  <li><code>expect(pm.response).to.have.status(200)</code> - Assert status code</li>
                  <li><code>console.log(message)</code> - Output to console (shown in test results)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
