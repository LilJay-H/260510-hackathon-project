import { useStore } from '../../store/useStore'
import { X, BookOpen, Layers, Hash, FileText, ArrowRight } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  '核心概念': '#3b82f6',
  '解剖结构': '#ef4444',
  '生理过程': '#10b981',
  '病理变化': '#f59e0b',
  '临床表现': '#8b5cf6',
  '诊断方法': '#06b6d4',
  '治疗原则': '#f97316',
}

const RELATION_LABELS: Record<string, string> = {
  prerequisite: '前置依赖',
  parallel: '并列关系',
  contains: '包含关系',
  applies_to: '应用关系',
}

export function NodeDetail() {
  const { selectedNode, setSelectedNode, edges, nodes } = useStore()

  if (!selectedNode) return null

  const catColor = CATEGORY_COLORS[selectedNode.category] || '#6b7280'
  const bookCount = (selectedNode as any).textbook_count || 1

  const connected = edges
    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
    .map(e => {
      const otherId = e.source === selectedNode.id ? e.target : e.source
      const otherNode = nodes.find(n => n.id === otherId)
      return otherNode ? { ...e, otherNode, direction: e.source === selectedNode.id ? 'out' : 'in' } : null
    })
    .filter(Boolean)
    .slice(0, 10)

  return (
    <div className="absolute right-0 top-0 w-80 h-full bg-surface border-l border-border z-10 overflow-auto animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text truncate">{selectedNode.name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: catColor + '18', color: catColor }}
            >
              {selectedNode.category}
            </span>
            {bookCount > 1 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber/15 text-amber font-medium">
                跨{bookCount}本教材
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-text-faint hover:text-text-dim p-1 rounded hover:bg-raised transition-colors duration-200 ml-2"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Definition */}
        <div>
          <label className="text-[9px] font-medium text-text-faint uppercase tracking-wider block mb-1.5">定义</label>
          <p className="text-[11px] text-text-dim leading-relaxed">{selectedNode.definition}</p>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-2">
          <MetaItem icon={<BookOpen size={10} />} label="教材" value={selectedNode.textbook_name} />
          <MetaItem icon={<Layers size={10} />} label="章节" value={selectedNode.chapter} />
          <MetaItem icon={<Hash size={10} />} label="页码" value={String(selectedNode.page)} />
          <MetaItem icon={<FileText size={10} />} label="ID" value={selectedNode.id.slice(-8)} mono />
        </div>

        {/* Connected nodes */}
        {connected.length > 0 && (
          <div>
            <label className="text-[9px] font-medium text-text-faint uppercase tracking-wider block mb-2">
              关联节点 ({connected.length})
            </label>
            <div className="space-y-1">
              {connected.map((c, i) => {
                if (!c) return null
                const otherCatColor = CATEGORY_COLORS[c.otherNode.category] || '#6b7280'
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedNode(c.otherNode)}
                    className="w-full text-left bg-raised hover:bg-border rounded px-2.5 py-1.5 transition-colors duration-200 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: otherCatColor }}
                      />
                      <span className="text-[10px] text-text truncate flex-1">{c.otherNode.name}</span>
                      <span className="text-[9px] text-text-faint shrink-0">
                        {RELATION_LABELS[c.relation_type] || c.relation_type}
                      </span>
                      <ArrowRight size={8} className="text-text-faint group-hover:text-text-dim shrink-0" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetaItem({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-raised rounded px-2 py-1.5">
      <div className="flex items-center gap-1 text-text-faint mb-0.5">
        {icon}
        <span className="text-[8px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-[10px] text-text-dim truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
