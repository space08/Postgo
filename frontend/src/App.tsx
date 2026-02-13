import { useState, useEffect } from 'react';
import { History, List, Info, Globe, Download, Upload, Minus, Square, X } from 'lucide-react';
import './App.css';
import { WindowMinimise, WindowToggleMaximise, Quit } from '../wailsjs/runtime/runtime';
import { 
  SendRequest, 
  GetHistory, 
  ClearHistory, 
  DeleteHistoryRecord,
  GetAllProjects,
  CreateProject,
  UpdateProject,
  DeleteProject,
  GetAllHeaders,
  SaveHeader,
  DeleteHeader,
  GetProjectRequests,
  ImportOpenAPI,
  GetAllEnvironments,
  SaveEnvironment,
  DeleteEnvironment,
  SetActiveEnvironment,
  GetActiveEnvironment,
  GetSavedTabs,
  SaveTabsState,
  ExportAllData,
  ImportAllData
} from "../wailsjs/go/main/App";
import TabBar from './components/TabBar';
import RequestEditor from './components/RequestEditor';
import ResponseViewer from './components/ResponseViewer';
import HistoryPanel from './components/HistoryPanel';
import ProjectSidebar from './components/ProjectSidebar';
import { Tab, HttpRequest, HttpResponse, HistoryRecord, Project, Header, Environment } from './types';
import { main } from '../wailsjs/go/models';
import HeaderManager from './components/HeaderManager';
import AboutDialog from './components/AboutDialog';
import EnvironmentManager from './components/EnvironmentManager';

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [requestHeight, setRequestHeight] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState<Header[]>([]);
  const [showHeaderManager, setShowHeaderManager] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string>('');
  const [showEnvironmentManager, setShowEnvironmentManager] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const savedTabs = await GetSavedTabs();
        if (savedTabs && savedTabs.length > 0) {
          const restoredTabs = savedTabs.map((tabState: any) => ({
            id: tabState.id,
            title: tabState.title,
            request: new main.HttpRequest(tabState.request),
            response: undefined,
          }));
          setTabs(restoredTabs);
          const activeTab = savedTabs.find((t: any) => t.isActive);
          setActiveTabId(activeTab?.id || restoredTabs[0].id);
        } else {
          const initialTab = createNewTab();
          setTabs([initialTab]);
          setActiveTabId(initialTab.id);
        }
      } catch (err) {
        console.error('Failed to load saved tabs:', err);
        const initialTab = createNewTab();
        setTabs([initialTab]);
        setActiveTabId(initialTab.id);
      }
      
      loadHistory();
      loadProjects();
      loadHeaders();
      loadEnvironments();
    };
    
    initializeApp();
  }, []);

  const loadEnvironments = async () => {
    try {
      const envsData = await GetAllEnvironments();
      setEnvironments(envsData || []);
      const activeId = await GetActiveEnvironment();
      setActiveEnvironmentId(activeId || '');
    } catch (err) {
      console.error('Failed to load environments:', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId && tabs.length > 1) {
          handleTabClose(activeTabId);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        handleNewTab();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs]);

  useEffect(() => {
    if (tabs.length === 0) return;
    
    const saveTabsAsync = async () => {
      try {
        const tabStates = tabs.map(tab => new main.TabState({
          id: tab.id,
          title: tab.title,
          request: tab.request,
          isActive: tab.id === activeTabId
        }));
        await SaveTabsState(tabStates);
      } catch (err) {
        console.error('Failed to save tabs:', err);
      }
    };
    
    const timeoutId = setTimeout(saveTabsAsync, 500);
    return () => clearTimeout(timeoutId);
  }, [tabs, activeTabId]);

  const createNewTab = (): Tab => {
    const id = `tab-${Date.now()}`;
    return {
      id,
      title: 'New Request',
      request: new main.HttpRequest({
        id: `req-${Date.now()}`,
        name: 'New Request',
        method: 'GET',
        url: '',
        headers: [],
        params: [],
        projectId: selectedProjectId || undefined,
      }),
    };
  };

  const loadHistory = async () => {
    try {
      const historyData = await GetHistory(50);
      setHistory(historyData || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const projectsData = await GetAllProjects();
      console.log('Loaded projects:', projectsData);
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadHeaders = async () => {
    try {
      const headersData = await GetAllHeaders();
      setHeaders(headersData || []);
    } catch (err) {
      console.error('Failed to load headers:', err);
    }
  };

  const handleCreateProject = async (name: string, description: string, baseUrl: string) => {
    try {
      const newProject = new main.Project({
        id: `proj-${Date.now()}`,
        name,
        description,
        baseUrl,
      });
      console.log('Creating project:', newProject);
      await CreateProject(newProject);
      console.log('Project created successfully');
      await loadProjects();
      console.log('Projects reloaded');
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project: ' + err);
    }
  };

  const handleUpdateProject = async (project: Project) => {
    try {
      const updatedProject = new main.Project(project);
      await UpdateProject(updatedProject);
      await loadProjects();
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await DeleteProject(projectId);
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      await loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleSaveHeader = async (header: Header) => {
    try {
      await SaveHeader(header);
      await loadHeaders();
    } catch (err) {
      console.error('Failed to save header:', err);
    }
  };

  const handleDeleteHeader = async (headerId: string) => {
    try {
      await DeleteHeader(headerId);
      await loadHeaders();
    } catch (err) {
      console.error('Failed to delete header:', err);
    }
  };

  const handleSaveEnvironment = async (env: Environment) => {
    try {
      await SaveEnvironment(env);
      await loadEnvironments();
    } catch (err) {
      console.error('Failed to save environment:', err);
    }
  };

  const handleDeleteEnvironment = async (envId: string) => {
    try {
      await DeleteEnvironment(envId);
      if (activeEnvironmentId === envId) {
        await SetActiveEnvironment('');
        setActiveEnvironmentId('');
      }
      await loadEnvironments();
    } catch (err) {
      console.error('Failed to delete environment:', err);
    }
  };

  const handleSetActiveEnvironment = async (envId: string) => {
    try {
      await SetActiveEnvironment(envId);
      setActiveEnvironmentId(envId);
    } catch (err) {
      console.error('Failed to set active environment:', err);
    }
  };

  const handleExportData = async () => {
    try {
      const path = await ExportAllData();
      if (path) {
        alert(`数据已导出到: ${path}`);
      }
    } catch (err) {
      console.error('Failed to export data:', err);
      alert('导出失败: ' + err);
    }
  };

  const handleImportData = async () => {
    try {
      const path = await ImportAllData();
      if (!path) {
        return;
      }
      alert('数据导入成功！正在刷新...');
      window.location.reload();
    } catch (err) {
      console.error('Failed to import data:', err);
      alert('导入失败: ' + err);
    }
  };

  const handleImport = async (fileContent: string, format: string, projectId: string, baseURL: string) => {
    try {
      const requests = await ImportOpenAPI(fileContent, format, projectId, baseURL);
      console.log(`Imported ${requests.length} requests`);
      
      await loadHistory();
      
      if (requests.length > 0) {
        const firstRequest = requests[0];
        const newRequest = new main.HttpRequest(firstRequest);
        const newTab: Tab = {
          id: `tab-${Date.now()}`,
          title: firstRequest.name || firstRequest.url,
          request: newRequest,
        };
        setTabs([...tabs, newTab]);
        setActiveTabId(newTab.id);
        
        if (projectId) {
          setSelectedProjectId(projectId);
        }
      }
      
      alert(`成功导入 ${requests.length} 个 API`);
    } catch (err) {
      console.error('Failed to import:', err);
      alert('导入失败: ' + err);
    }
  };

  const handleNewTab = () => {
    const newTab = createNewTab();
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTabClick = (id: string) => {
    setActiveTabId(id);
  };

  const handleTabClose = (id: string) => {
    if (tabs.length === 1) return;
    
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const handleCloseOtherTabs = (id: string) => {
    const tabToKeep = tabs.find(tab => tab.id === id);
    if (!tabToKeep) return;
    setTabs([tabToKeep]);
    setActiveTabId(id);
  };

  const handleCloseRightTabs = (id: string) => {
    const index = tabs.findIndex(tab => tab.id === id);
    if (index === -1) return;
    
    const newTabs = tabs.slice(0, index + 1);
    setTabs(newTabs);
    
    // If active tab was closed, switch to the rightmost remaining tab (which is the context tab)
    if (!newTabs.some(tab => tab.id === activeTabId)) {
      setActiveTabId(id);
    }
  };

  const handleCloseLeftTabs = (id: string) => {
    const index = tabs.findIndex(tab => tab.id === id);
    if (index === -1) return;
    
    const newTabs = tabs.slice(index);
    setTabs(newTabs);
    
    // If active tab was closed, switch to the leftmost remaining tab (which is the context tab)
    if (!newTabs.some(tab => tab.id === activeTabId)) {
      setActiveTabId(id);
    }
  };

  const handleCloseAllTabs = () => {
    // Keep at least one new tab
    const newTab = createNewTab();
    setTabs([newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTabReorder = (fromIndex: number, toIndex: number) => {
    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);
    setTabs(newTabs);
  };

  const handleRequestChange = (request: HttpRequest) => {
    setTabs(tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, request: new main.HttpRequest(request), title: request.url || 'New Request' }
        : tab
    ));
  };

  const handleSend = async () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;

    setLoading(true);
    
    setTabs(tabs.map(tab =>
      tab.id === activeTabId
        ? { ...tab, error: undefined }
        : tab
    ));
    
    try {
      let requestToSend = activeTab.request;
      
      let url = activeTab.request.url;
      url = url.replace(/\/\{[^}]+\}/g, '');
      
      if (activeTab.pathParams && activeTab.pathParamOrder && activeTab.pathParamOrder.length > 0) {
        const pathValues = activeTab.pathParamOrder
          .map(key => activeTab.pathParams![key])
          .filter(v => v);
        
        if (pathValues.length > 0) {
          url = url + '/' + pathValues.join('/');
        }
      }
      
      if (url !== activeTab.request.url || activeTab.pathParams) {
        requestToSend = new main.HttpRequest({
          ...activeTab.request,
          url: url
        });
      }
      
      const response: HttpResponse = await SendRequest(requestToSend);
      
      setTabs(tabs.map(tab =>
        tab.id === activeTabId
          ? { ...tab, response, error: undefined }
          : tab
      ));
      
      await loadHistory();
      await loadHeaders();
    } catch (err: any) {
      console.error('Request failed:', err);
      
      let errorMessage = '请求失败';
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setTabs(tabs.map(tab =>
        tab.id === activeTabId
          ? { ...tab, error: errorMessage, response: undefined }
          : tab
      ));
    } finally {
      setLoading(false);
    }
  };



  const handleSelectHistory = (request: HttpRequest) => {
    const newRequest = new main.HttpRequest(request);
    newRequest.id = `req-${Date.now()}`;
    
    // Dynamically prepend Base URL if project has one and URL is relative (starts with /)
    if (newRequest.projectId) {
      const project = projects.find(p => p.id === newRequest.projectId);
      if (project && project.baseUrl && newRequest.url.startsWith('/')) {
        // Remove trailing slash from base URL and leading slash from request URL to avoid double slashes
        const baseUrl = project.baseUrl.replace(/\/$/, '');
        const path = newRequest.url; // Already starts with /
        newRequest.url = `${baseUrl}${path}`;
      }
    }
    
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      title: request.url || 'New Request',
      request: newRequest,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setShowHistory(false);
    
    if (newRequest.projectId && newRequest.projectId !== selectedProjectId) {
      setSelectedProjectId(newRequest.projectId);
    }
  };

  const handleClearHistory = async () => {
    try {
      await ClearHistory();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await DeleteHistoryRecord(id);
      setHistory(history.filter(record => record.id !== id));
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.main-content-container');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const newHeight = (offsetY / rect.height) * 100;
      
      if (newHeight >= 20 && newHeight <= 80) {
        setRequestHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white" style={{ userSelect: isDragging ? 'none' : 'auto' }}>
      {/* Custom Title Bar */}
      <div className="flex items-center justify-between bg-gray-800 border-b border-gray-700" style={{ height: '32px' }} data-wails-drag>
        <div className="flex items-center h-full flex-1">
          <h1 className="ml-2 text-sm font-semibold text-gray-300">PostGo</h1>
        </div>
        <div className="flex items-center h-full gap-2 mr-3" data-wails-no-drag>
          <button
            onClick={() => setShowAboutDialog(true)}
            className="w-5 h-5 rounded-full bg-gray-500 hover:bg-gray-400 flex items-center justify-center group"
          >
            <Info size={12} className="text-gray-900 group-hover:text-gray-800" />
          </button>
          <button
            onClick={() => WindowMinimise()}
            className="w-5 h-5 rounded-full bg-yellow-500 hover:bg-yellow-400 flex items-center justify-center group"
          >
            <Minus size={12} className="text-yellow-900 group-hover:text-yellow-800" />
          </button>
          <button
            onClick={() => WindowToggleMaximise()}
            className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center group"
          >
            <Square size={10} className="text-green-900 group-hover:text-green-800" />
          </button>
          <button
            onClick={() => Quit()}
            className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group"
          >
            <X size={12} className="text-red-900 group-hover:text-red-800" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="text-sm font-medium text-gray-400">API Client</div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEnvironmentManager(true)}
            className={`px-3 py-1 rounded flex items-center gap-2 ${
              activeEnvironmentId 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <Globe size={16} />
            {activeEnvironmentId 
              ? environments.find(e => e.id === activeEnvironmentId)?.name || 'Environment'
              : 'Environment'}
          </button>
          <button
            onClick={() => setShowHeaderManager(true)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2"
          >
            <List size={16} />
            Headers
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2"
          >
            <History size={16} />
            History
          </button>
          
          <button
            onClick={handleExportData}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={handleImportData}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2"
          >
            <Upload size={16} />
            Import
          </button>
        </div>
      </div>

      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
        onCloseOtherTabs={handleCloseOtherTabs}
        onCloseRightTabs={handleCloseRightTabs}
        onCloseLeftTabs={handleCloseLeftTabs}
        onCloseAllTabs={handleCloseAllTabs}
        onTabReorder={handleTabReorder}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-shrink-0">
          <ProjectSidebar
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onOpenRequest={handleSelectHistory}
            onImport={handleImport}
          />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0 main-content-container relative">
          <div style={{ height: `calc(${requestHeight}% - 3px)` }} className="overflow-hidden">
            {activeTab && (
              <RequestEditor
                request={activeTab.request}
                onRequestChange={handleRequestChange}
                onSend={handleSend}
                headers={headers}
                pathParams={activeTab.pathParams || {}}
                pathParamOrder={activeTab.pathParamOrder || []}
                onPathParamsChange={(params, order) => {
                  setTabs(tabs.map(tab =>
                    tab.id === activeTabId
                      ? { ...tab, pathParams: params, pathParamOrder: order }
                      : tab
                  ));
                }}
              />
            )}
          </div>
          <div 
            className={`h-1.5 flex items-center justify-center cursor-row-resize group transition-colors flex-shrink-0 ${
              isDragging ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className={`w-16 h-1 rounded-full transition-colors ${
              isDragging ? 'bg-blue-300' : 'bg-gray-500 group-hover:bg-gray-400'
            }`}></div>
          </div>
          <div style={{ height: `calc(${100 - requestHeight}% - 3px)` }} className="overflow-hidden">
            {activeTab && (
              <ResponseViewer
                response={activeTab.response}
                loading={loading}
                error={activeTab.error}
                onSaveHeader={handleSaveHeader}
              />
            )}
          </div>
        </div>

        {showHistory && (
          <div className="w-80 flex-shrink-0">
            <HistoryPanel
              history={history}
              onSelectHistory={handleSelectHistory}
              onClearHistory={handleClearHistory}
              onDeleteRecord={handleDeleteRecord}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
      </div>

      {showHeaderManager && (
        <HeaderManager
          headers={headers}
          onSaveHeader={handleSaveHeader}
          onDeleteHeader={handleDeleteHeader}
          onClose={() => setShowHeaderManager(false)}
        />
      )}

      {showAboutDialog && (
        <AboutDialog onClose={() => setShowAboutDialog(false)} />
      )}

      {showEnvironmentManager && (
        <EnvironmentManager
          environments={environments}
          activeEnvironmentId={activeEnvironmentId}
          onSaveEnvironment={handleSaveEnvironment}
          onDeleteEnvironment={handleDeleteEnvironment}
          onSetActive={handleSetActiveEnvironment}
          onClose={() => setShowEnvironmentManager(false)}
        />
      )}
    </div>
  );
}

export default App;
