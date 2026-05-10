import { useStore } from '../../store/useStore'
import { Activity, Database, Cpu } from 'lucide-react'

export function StatusBar() {
  const { loading, compressionRatio, textbooks, nodes, edges } = useStore()
  const anyLoading = Object.values(loading).some(Boolean)

  return (
    <footer className="h-6 border-t border-border flex items-center px-4 gap-4 bg-abyss/80 text-[9px] text-text-muted shrink-0 font-mono">
      {/* Status */}
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${anyLoading ? 'bg-accent-amber animate-pulse' : 'bg-accent-green'}`} />
        <span>{anyLoading ? '处理中...' : '就绪'}</span>
      </div>

      <div className="w-px h-3 bg-border" />

      {/* Stats */}
      <div className="flex items-center gap-1">
        <Database size={9} />
        <span>{textbooks.length} 教材</span>
      </div>
      <div className="flex items-center gap-1">
        <Activity size={9} />
        <span>{nodes.length} 节点</span>
      </div>
      <div className="flex items-center gap-1">
        <Cpu size={9} />
        <span>压缩 {compressionRatio < 1 ? (compressionRatio * 100).toFixed(0) + '%' : '—'}</span>
      </div>

      <div className="ml-auto text-text-muted/40">学科知识整合智能体</div>
    </footer>
  )
}
