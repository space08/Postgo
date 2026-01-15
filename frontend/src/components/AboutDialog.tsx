import { X, Send } from 'lucide-react';

interface AboutDialogProps {
  onClose: () => void;
}

export default function AboutDialog({ onClose }: AboutDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[450px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Send size={24} className="text-purple-500" />
            关于 PostGo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 text-gray-300">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl flex items-center justify-center">
              <Send size={40} className="text-white" />
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">PostGo</h3>
            <p className="text-gray-400 text-sm">现代化的 HTTP 客户端</p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">版本号：</span>
              <span className="text-white font-mono">v1.0.1</span>
            </div>
            <div className="border-t border-gray-600"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">联系方式：</span>
              <span className="text-white">QQ 1478431121</span>
            </div>
            <div className="border-t border-gray-600"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">开发框架：</span>
              <span className="text-white">Wails + React</span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 mt-6">
            <p>© 2026 PostGo. All rights reserved.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
        >
          确定
        </button>
      </div>
    </div>
  );
}
