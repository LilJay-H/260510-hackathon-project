import { useState } from 'react'
import { KnowledgeGraph } from '../graph/KnowledgeGraph'
import { Network, GitFork } from 'lucide-react'

export type ViewMode = 'force' | 'tree'

export function CenterPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('force')

  return (
    <div className="flex-1 relative bg-void overflow-hidden bg-grid">
      {/* View mode toggle */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-abyss/80 backdrop-blur-sm border border-border rounded-lg p-0.5">
        <button
          onClick={() => setViewMode('force')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
            viewMode === 'force'
              ? 'bg-accent-blue/15 text-accent-blue'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Network size={12} />
          力导向
        </button>
        <button
          onClick={() => setViewMode('tree')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
            viewMode === 'tree'
              ? 'bg-accent-blue/15 text-accent-blue'
              : 'text-text-muted hover:text-text-secondary'
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
