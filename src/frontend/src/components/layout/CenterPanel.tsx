import { useState } from 'react'
import { KnowledgeGraph } from '../graph/KnowledgeGraph'
import { Network, GitFork } from 'lucide-react'

export type ViewMode = 'force' | 'tree'

export function CenterPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('force')

  return (
    <div className="flex-1 relative bg-bg overflow-hidden">
      {/* View mode toggle */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 bg-raised border border-border rounded p-0.5">
        <button
          onClick={() => setViewMode('force')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-all duration-200 ${
            viewMode === 'force'
              ? 'bg-blue/15 text-blue'
              : 'text-text-faint hover:text-text-dim'
          }`}
        >
          <Network size={12} />
          力导向
        </button>
        <button
          onClick={() => setViewMode('tree')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-all duration-200 ${
            viewMode === 'tree'
              ? 'bg-blue/15 text-blue'
              : 'text-text-faint hover:text-text-dim'
          }`}
        >
          <GitFork size={12} />
          树状图
        </button>
      </div>

      <KnowledgeGraph viewMode={viewMode} />
    </div>
  )
}
