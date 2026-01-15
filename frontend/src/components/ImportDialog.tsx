import { useState, useEffect } from 'react';
import { X, Upload, FileJson, FileCode } from 'lucide-react';
import { Project } from '../types';

interface ImportDialogProps {
  projects: Project[];
  onImport: (fileContent: string, format: string, projectId: string, baseURL: string) => void;
  onClose: () => void;
  preselectedProjectId?: string;
}

export default function ImportDialog({ projects, onImport, onClose, preselectedProjectId = '' }: ImportDialogProps) {
  const [fileContent, setFileContent] = useState('');
  const [format, setFormat] = useState<'json' | 'yaml'>('json');
  const [projectId, setProjectId] = useState(preselectedProjectId);
  const [baseURL, setBaseURL] = useState('');
  const [fileName, setFileName] = useState('');

  // Update Base URL when project selection changes
  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project && project.baseUrl) {
        setBaseURL(project.baseUrl);
      } else {
        // Only clear if switching to "No Project" or a project without URL? 
        // Or keep user input? 
        // The user requirement implies syncing. So if I select a project with a Base URL, it should show it.
        // If I select "No Project", maybe clear it or leave it?
        // Let's assume if the project has one, we use it.
      }
    }
  }, [projectId, projects]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'json') {
      setFormat('json');
    } else if (ext === 'yml' || ext === 'yaml') {
      setFormat('yaml');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!fileContent) {
      alert('Please select a file first');
      return;
    }

    onImport(fileContent, format, projectId, baseURL);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[600px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Upload size={24} />
            导入 OpenAPI 文件
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              选择文件
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    {fileName ? (
                      <>
                        {format === 'json' ? (
                          <FileJson size={32} className="text-blue-500" />
                        ) : (
                          <FileCode size={32} className="text-green-500" />
                        )}
                        <p className="text-white text-sm">{fileName}</p>
                        <p className="text-gray-500 text-xs">
                          {format.toUpperCase()} 格式
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-gray-500" />
                        <p className="text-gray-400 text-sm">
                          点击选择文件或拖拽到此处
                        </p>
                        <p className="text-gray-500 text-xs">
                          支持 .json, .yml, .yaml 文件
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".json,.yml,.yaml"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              文件格式
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as 'json')}
                  className="text-blue-600"
                />
                <span className="text-white">JSON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="yaml"
                  checked={format === 'yaml'}
                  onChange={(e) => setFormat(e.target.value as 'yaml')}
                  className="text-blue-600"
                />
                <span className="text-white">YAML</span>
              </label>
            </div>
          </div>

          {!preselectedProjectId && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                导入到项目（可选）
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="">无项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {preselectedProjectId && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                导入到项目
              </label>
              <div className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">
                {projects.find(p => p.id === preselectedProjectId)?.name || '未知项目'}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Base URL（可选）
            </label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="例如: https://api.example.com"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
            />
            <p className="text-gray-500 text-xs mt-1">
              如果 OpenAPI 文件中未定义服务器地址，将使用此 URL
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleImport}
            disabled={!fileContent}
            className={`flex-1 py-2 rounded ${
              fileContent
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            导入
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
