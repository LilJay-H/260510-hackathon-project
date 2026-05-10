import { useStore } from '../../store/useStore'
import { Activity, Database, Cpu } from 'lucide-react'

/**
 * 底部状态栏 — h-6 (24px)
 * 样式: bg-surface, 1px border-top, 等宽字体
 * 信息: 系统状态 + 教材/节点/压缩率 + 产品名
 */
export function StatusBar() {
  const { loading, compressionRatio, textbooks, nodes, edges } = useStore()
  const anyLoading = Object.values(loading).some(Boolean)

  return (
    <footer className="h-6 border-t border-border flex items-center px-4 gap-4 bg-surface text-xs text-text-faint shrink-0 font-mono">
      {/* 系统状态指示灯 */}
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${anyLoading ? 'bg-amber animate-pulse' : 'bg-green'}`} />
        <span>{anyLoading ? '处理中...' : '就绪'}</span>
      </div>

      <div className="w-px h-3 bg-border" />

      {/* 数据统计 */}
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

      {/* 产品名称 */}
      <div className="ml-auto text-text-faint/40">学科知识整合智能体</div>
    </footer>
  )
}
