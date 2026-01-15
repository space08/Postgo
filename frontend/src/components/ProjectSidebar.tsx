import { useState, useEffect } from 'react';
import { Folder, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, ChevronDown, FileText, Inbox, Download, Play } from 'lucide-react';
import { Project, HistoryRecord } from '../types';
import { main } from '../../wailsjs/go/models';
import { GetProjectRequests, ExportProjectAPI } from '../../wailsjs/go/main/App';
import ImportDialog from './ImportDialog';
import { CollectionRunner } from './CollectionRunner';

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: (name: string, description: string, baseUrl: string) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenRequest: (request: any) => void;
  onImport: (fileContent: string, format: string, projectId: string, baseURL: string) => void;
}

export default function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  isCollapsed,
  onToggleCollapse,
  onOpenRequest,
  onImport,
}: ProjectSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectBaseUrl, setProjectBaseUrl] = useState('http://127.0.0.1:8080');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [projectRequests, setProjectRequests] = useState<Record<string, HistoryRecord[]>>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importTargetProjectId, setImportTargetProjectId] = useState<string>('');
  const [showCollectionRunner, setShowCollectionRunner] = useState(false);
  const [runnerProject, setRunnerProject] = useState<Project | null>(null);

  const handleCreate = () => {
    if (projectName.trim()) {
      onCreateProject(projectName.trim(), projectDescription.trim(), projectBaseUrl.trim());
      setProjectName('');
      setProjectDescription('');
      setProjectBaseUrl('http://127.0.0.1:8080');
      setShowCreateDialog(false);
    }
  };

  const handleUpdate = () => {
    if (editingProject && projectName.trim()) {
      const updated = new main.Project({
        ...editingProject,
        name: projectName.trim(),
        description: projectDescription.trim(),
        baseUrl: projectBaseUrl.trim(),
      });
      onUpdateProject(updated);
      setEditingProject(null);
      setProjectName('');
      setProjectDescription('');
      setProjectBaseUrl('http://127.0.0.1:8080');
    }
  };

  const startEdit = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setProjectBaseUrl(project.baseUrl || '');
  };

  const cancelEdit = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectDescription('');
    setProjectBaseUrl('http://127.0.0.1:8080');
    setShowCreateDialog(false);
  };

  const handleExportJSON = async (projectId: string) => {
    try {
      await ExportProjectAPI(projectId);
    } catch (err) {
      console.error("Failed to export", err);
    }
  };

  const handleImport = async (fileContent: string, format: string, projectId: string, baseURL: string) => {
    // Try to detect PostGo Project JSON
    if (format === 'json') {
      try {
        const parsed = JSON.parse(fileContent);
        // Basic check if it's an array of requests
        if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].method || parsed[0].url)) {
          // Call backend ImportProjectJSON
          await (window as any)['go']['main']['App']['ImportProjectJSON'](projectId, fileContent);

          if (projectId) {
            const newExpanded = new Set(expandedProjects);
            newExpanded.add(projectId);
            setExpandedProjects(newExpanded);

            const requests = await GetProjectRequests(projectId);
            setProjectRequests(prev => ({
              ...prev,
              [projectId]: requests || []
            }));
          }
          setShowImportDialog(false);
          setImportTargetProjectId('');
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    await onImport(fileContent, format, projectId, baseURL);
    setShowImportDialog(false);
    
    if (projectId) {
      const newExpanded = new Set(expandedProjects);
      newExpanded.add(projectId);
      setExpandedProjects(newExpanded);
      
      try {
        const requests = await GetProjectRequests(projectId);
        setProjectRequests(prev => ({
          ...prev,
          [projectId]: requests || []
        }));
      } catch (err) {
        console.error('Failed to reload project requests:', err);
      }
    }
    
    setImportTargetProjectId('');
  };

  const toggleProjectExpand = async (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      if (!projectRequests[projectId]) {
        try {
          const requests = await GetProjectRequests(projectId);
          setProjectRequests(prev => ({
            ...prev,
            [projectId]: requests || []
          }));
        } catch (err) {
          console.error('Failed to load project requests:', err);
        }
      }
    }
    setExpandedProjects(newExpanded);
  };

  useEffect(() => {
    if (selectedProjectId && !isCollapsed) {
      const newExpanded = new Set(expandedProjects);
      if (!newExpanded.has(selectedProjectId)) {
        newExpanded.add(selectedProjectId);
        setExpandedProjects(newExpanded);
        
        if (!projectRequests[selectedProjectId]) {
          GetProjectRequests(selectedProjectId).then(requests => {
            setProjectRequests(prev => ({
              ...prev,
              [selectedProjectId]: requests || []
            }));
          }).catch(err => {
            console.error('Failed to load project requests:', err);
          });
        }
      }
    }
  }, [selectedProjectId, isCollapsed]);

  return (
    <div className={`bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-64'
    }`}>
      <div className={`border-b border-gray-700 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {!isCollapsed && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Projects</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="text-blue-500 hover:text-blue-400"
                  title="创建项目"
                >
                  <Plus size={20} />
                </button>
                <button
                  onClick={onToggleCollapse}
                  className="text-gray-400 hover:text-white"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
            </div>
            <button
              onClick={() => onSelectProject(null)}
              className={`w-full px-3 py-2 rounded flex items-center gap-2 text-sm ${
                selectedProjectId === null
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Folder size={16} />
              All Requests
            </button>
          </>
        )}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggleCollapse}
              className="text-gray-400 hover:text-white p-1"
              title="Expand Sidebar"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={() => onSelectProject(null)}
              className={`p-2 rounded ${
                selectedProjectId === null
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
              title="All Requests"
            >
              <Folder size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!isCollapsed ? (
          projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const requests = projectRequests[project.id] || [];
            
            return (
              <div key={project.id} className="mb-1">
                <div
                  className={`group px-3 py-2 rounded cursor-pointer flex items-center justify-between ${
                    selectedProjectId === project.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div
                    onClick={() => toggleProjectExpand(project.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <ChevronRight 
                      size={14} 
                      className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <Folder size={16} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{project.name}</div>
                      {project.description && (
                        <div className="text-xs opacity-70 truncate">{project.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRunnerProject(project);
                        setShowCollectionRunner(true);
                      }}
                      className="p-1 hover:bg-green-600 rounded"
                      title="Run Collection"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportJSON(project.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded"
                      title="Export JSON"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(project);
                      }}
                      className="p-1 hover:bg-gray-600 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete project "${project.name}"?`)) {
                          onDeleteProject(project.id);
                        }
                      }}
                      className="p-1 hover:bg-red-600 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="ml-2 mt-1">
                    {requests.length === 0 ? (
                      <div className="bg-gray-750 rounded-lg py-8 px-4 flex flex-col items-center justify-center border border-gray-700">
                        <Inbox size={40} className="text-gray-600 mb-3" />
                        <p className="text-gray-500 text-sm mb-4">集合为空</p>
                        <button
                          onClick={() => {
                            setImportTargetProjectId(project.id);
                            setShowImportDialog(true);
                          }}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center gap-1"
                        >
                          <Plus size={14} />
                          新增
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-0.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                        {requests.map((record) => (
                          <div
                            key={record.id}
                            onClick={() => onOpenRequest(record.request)}
                            className="group px-2 py-2 rounded cursor-pointer flex items-center gap-2 text-gray-300 hover:bg-gray-700"
                          >
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded min-w-[45px] text-center ${
                              record.request.method === 'GET' ? 'text-green-500' :
                              record.request.method === 'POST' ? 'text-orange-500' :
                              record.request.method === 'PUT' ? 'text-blue-500' :
                              record.request.method === 'DELETE' ? 'text-red-500' :
                              record.request.method === 'PATCH' ? 'text-purple-500' :
                              'text-gray-400'
                            }`}>
                              {record.request.method}
                            </span>
                            <span className="text-sm truncate flex-1">{record.request.name || record.request.url}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={`w-full p-2 rounded mb-1 flex items-center justify-center ${
                selectedProjectId === project.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
              title={project.name}
            >
              <Folder size={16} />
            </button>
          ))
        )}
      </div>

      {(showCreateDialog || editingProject) && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingProject ? 'Edit Project' : 'Create Project'}
              </h3>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Project description"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Base URL (optional)
                </label>
                <input
                  type="text"
                  value={projectBaseUrl}
                  onChange={(e) => setProjectBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={editingProject ? handleUpdate : handleCreate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportDialog && (
        <ImportDialog
          projects={projects}
          onImport={handleImport}
          onClose={() => {
            setShowImportDialog(false);
            setImportTargetProjectId('');
          }}
          preselectedProjectId={importTargetProjectId}
        />
      )}

      {showCollectionRunner && runnerProject && (
        <CollectionRunner
          project={runnerProject}
          onClose={() => {
            setShowCollectionRunner(false);
            setRunnerProject(null);
          }}
        />
      )}
    </div>
  );
}
