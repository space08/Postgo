import { Play, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Project } from '../types';
import { RunCollection } from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';

interface CollectionRunnerProps {
  project: Project;
  onClose: () => void;
}

export function CollectionRunner({ project, onClose }: CollectionRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<main.CollectionRunResult | null>(null);

  const handleRunCollection = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const runResult = await RunCollection(project.id);
      setResult(runResult);
    } catch (error: any) {
      alert('运行集合失败: ' + error);
    } finally {
      setIsRunning(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Collection Runner - {project.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!result && !isRunning && (
            <div className="text-center py-12">
              <Play size={64} className="mx-auto text-gray-500 mb-4" />
              <p className="text-gray-400 mb-6">点击下方按钮运行项目中的所有请求</p>
              <button
                onClick={handleRunCollection}
                disabled={isRunning}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 mx-auto"
              >
                <Play size={20} />
                运行集合
              </button>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">正在运行请求...</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">总测试数</div>
                  <div className="text-2xl font-bold text-white">{result.totalTests}</div>
                </div>
                <div className="bg-green-900/20 border border-green-700 p-4 rounded-lg">
                  <div className="text-green-400 text-sm mb-1">通过</div>
                  <div className="text-2xl font-bold text-green-400">{result.passedTests}</div>
                </div>
                <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg">
                  <div className="text-red-400 text-sm mb-1">失败</div>
                  <div className="text-2xl font-bold text-red-400">{result.failedTests}</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                  <div className="text-blue-400 text-sm mb-1">总耗时</div>
                  <div className="text-2xl font-bold text-blue-400">{formatDuration(result.duration)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white mb-3">请求结果</h3>
                {result.requestResults.map((reqResult, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      reqResult.success
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-red-900/10 border-red-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        {reqResult.success ? (
                          <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                        ) : (
                          <XCircle className="text-red-500 flex-shrink-0" size={20} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              reqResult.method === 'GET' ? 'bg-green-600' :
                              reqResult.method === 'POST' ? 'bg-blue-600' :
                              reqResult.method === 'PUT' ? 'bg-yellow-600' :
                              reqResult.method === 'DELETE' ? 'bg-red-600' :
                              'bg-gray-600'
                            } text-white`}>
                              {reqResult.method}
                            </span>
                            <span className="text-white font-medium truncate">{reqResult.requestName}</span>
                          </div>
                          <div className="text-xs text-gray-400 truncate">{reqResult.url}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        {reqResult.status > 0 && (
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            reqResult.status >= 200 && reqResult.status < 300 ? 'bg-green-600 text-white' :
                            reqResult.status >= 400 && reqResult.status < 500 ? 'bg-yellow-600 text-white' :
                            reqResult.status >= 500 ? 'bg-red-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {reqResult.status}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <Clock size={14} />
                          {formatDuration(reqResult.duration)}
                        </div>
                      </div>
                    </div>

                    {reqResult.error && (
                      <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded text-sm">
                        <div className="text-red-400 font-medium mb-1">错误</div>
                        <div className="text-gray-300 font-mono text-xs">{reqResult.error}</div>
                      </div>
                    )}

                    {reqResult.tests && reqResult.tests.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <TrendingUp size={14} />
                          <span>测试: {reqResult.passedTests} / {reqResult.tests.length} 通过</span>
                        </div>
                        <div className="space-y-1">
                          {reqResult.tests.map((test, testIndex) => (
                            <div
                              key={testIndex}
                              className={`flex items-center gap-2 p-2 rounded text-sm ${
                                test.passed
                                  ? 'bg-green-900/10 text-green-300'
                                  : 'bg-red-900/10 text-red-300'
                              }`}
                            >
                              {test.passed ? (
                                <CheckCircle size={14} className="flex-shrink-0" />
                              ) : (
                                <XCircle size={14} className="flex-shrink-0" />
                              )}
                              <span className="flex-1">{test.name}</span>
                              {test.error && (
                                <span className="text-xs text-gray-400 font-mono">({test.error})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  开始时间: {new Date(result.startTime).toLocaleString('zh-CN')}
                </div>
                <button
                  onClick={handleRunCollection}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2"
                >
                  <Play size={16} />
                  重新运行
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
