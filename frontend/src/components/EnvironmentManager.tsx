import { useState } from 'react';
import { X, Plus, Trash2, Edit2, Save, XCircle } from 'lucide-react';
import { main } from '../../wailsjs/go/models';

interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

interface EnvironmentManagerProps {
  environments: Environment[];
  activeEnvironmentId: string;
  onSaveEnvironment: (env: Environment) => void;
  onDeleteEnvironment: (id: string) => void;
  onSetActive: (id: string) => void;
  onClose: () => void;
}

export default function EnvironmentManager({
  environments,
  activeEnvironmentId,
  onSaveEnvironment,
  onDeleteEnvironment,
  onSetActive,
  onClose,
}: EnvironmentManagerProps) {
  const [selectedEnvId, setSelectedEnvId] = useState<string>(activeEnvironmentId || '');
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNew = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: 'New Environment',
      variables: {},
    };
    setEditingEnv(newEnv);
    setIsCreating(true);
  };

  const handleEdit = (env: Environment) => {
    setEditingEnv({ ...env });
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!editingEnv) return;
    
    onSaveEnvironment(editingEnv);
    setEditingEnv(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingEnv(null);
    setIsCreating(false);
  };

  const handleAddVariable = () => {
    if (!editingEnv) return;
    const key = `var${Object.keys(editingEnv.variables).length + 1}`;
    setEditingEnv({
      ...editingEnv,
      variables: { ...editingEnv.variables, [key]: '' },
    });
  };

  const handleUpdateVariable = (oldKey: string, newKey: string, value: string) => {
    if (!editingEnv) return;
    const newVars = { ...editingEnv.variables };
    if (oldKey !== newKey) {
      delete newVars[oldKey];
    }
    newVars[newKey] = value;
    setEditingEnv({ ...editingEnv, variables: newVars });
  };

  const handleDeleteVariable = (key: string) => {
    if (!editingEnv) return;
    const newVars = { ...editingEnv.variables };
    delete newVars[key];
    setEditingEnv({ ...editingEnv, variables: newVars });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Environment Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-gray-700 flex flex-col">
            <div className="p-4">
              <button
                onClick={handleCreateNew}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                New Environment
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-700 border-l-4 ${
                    selectedEnvId === env.id
                      ? 'border-blue-500 bg-gray-700'
                      : 'border-transparent'
                  } ${
                    activeEnvironmentId === env.id ? 'text-green-400' : 'text-white'
                  }`}
                  onClick={() => setSelectedEnvId(env.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{env.name}</span>
                    {activeEnvironmentId === env.id && (
                      <span className="text-xs text-green-400">Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {editingEnv ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Environment Name
                  </label>
                  <input
                    type="text"
                    value={editingEnv.name}
                    onChange={(e) =>
                      setEditingEnv({ ...editingEnv, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Variables
                    </label>
                    <button
                      onClick={handleAddVariable}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Variable
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(editingEnv.variables).map(([key, value], index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={key}
                          onChange={(e) =>
                            handleUpdateVariable(key, e.target.value, value)
                          }
                          placeholder="Variable name"
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            handleUpdateVariable(key, key, e.target.value)
                          }
                          placeholder="Value"
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleDeleteVariable(key)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
                  >
                    <Save size={18} />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2"
                  >
                    <XCircle size={18} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : selectedEnvId ? (
              <div>
                {(() => {
                  const env = environments.find((e) => e.id === selectedEnvId);
                  if (!env) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-white">{env.name}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onSetActive(env.id)}
                            className={`px-4 py-2 rounded ${
                              activeEnvironmentId === env.id
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                            }`}
                          >
                            {activeEnvironmentId === env.id ? 'Active' : 'Set Active'}
                          </button>
                          <button
                            onClick={() => handleEdit(env)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
                          >
                            <Edit2 size={18} />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Are you sure you want to delete "${env.name}"?`
                                )
                              ) {
                                onDeleteEnvironment(env.id);
                                setSelectedEnvId('');
                              }
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2"
                          >
                            <Trash2 size={18} />
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded p-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Variables
                        </h4>
                        {Object.keys(env.variables).length === 0 ? (
                          <p className="text-gray-400 text-sm">No variables defined</p>
                        ) : (
                          <div className="space-y-2">
                            {Object.entries(env.variables).map(([key, value]) => (
                              <div
                                key={key}
                                className="flex gap-2 text-sm bg-gray-800 p-2 rounded"
                              >
                                <span className="text-blue-400 font-medium min-w-[150px]">
                                  {`{{${key}}}`}:
                                </span>
                                <span className="text-gray-200 break-all">{value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select an environment or create a new one
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
