import { useStore } from '../../store/useStore'
import { BookOpen, Network, GitBranch, Activity } from 'lucide-react'

/**
 * 顶部导航栏 — h-12 (48px)
 * 样式: bg-surface, 1px border-bottom, 阴影 shadow-sm
 * 布局: Logo + 分割线 + 统计数据 + 状态指示器
 */
export function Header() {
  const { textbooks, nodes, edges, decisions, loading } = useStore()
  const anyLoading = Object.values(loading).some(Boolean)

  return (
    <header className="h-12 border-b border-border flex items-center px-5 gap-5 bg-surface shrink-0 relative z-20 shadow-sm">
      {/* Logo 区域: 圆形图标 + 标题 */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded bg-blue flex items-center justify-center shadow-sm">
          <Network size={14} className="text-white" />
        </div>
        <h1 className="text-base font-semibold tracking-wide text-text">
          知识整合智能体
        </h1>
      </div>

      {/* 垂直分割线 */}
      <div className="w-px h-4 bg-border" />

      {/* 实时统计数据 */}
      <div className="flex items-center gap-4">
        <Stat icon={<BookOpen size={12} />} value={textbooks.length} label="教材" />
        <Stat icon={<Network size={12} />} value={nodes.length} label="节点" />
        <Stat icon={<GitBranch size={12} />} value={edges.length} label="关系" />
        {decisions.length > 0 && (
          <Stat icon={<Activity size={12} />} value={decisions.length} label="决策" />
        )}
      </div>

      {/* 加载状态指示器 */}
      {anyLoading && (
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          <span className="text-xs text-cyan font-mono">处理中</span>
        </div>
      )}

      {/* 版本号 */}
      <div className="ml-auto text-xs text-text-faint font-mono">v1.0</div>
    </header>
  )
}

/** 单个统计项: 图标 + 数值 + 标签 */
function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-text-dim">
      <span className="text-text-faint">{icon}</span>
      <span className="text-sm font-mono font-medium text-text">{value}</span>
      <span className="text-xs text-text-faint">{label}</span>
    </div>
  )
}
