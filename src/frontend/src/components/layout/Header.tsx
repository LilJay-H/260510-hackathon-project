import { useStore } from '../../store/useStore'
import { BookOpen, Network, GitBranch, Activity } from 'lucide-react'

export function Header() {
  const { textbooks, nodes, edges, decisions, loading } = useStore()
  const anyLoading = Object.values(loading).some(Boolean)

  return (
    <header className="h-11 border-b border-border flex items-center px-5 gap-5 bg-abyss/80 backdrop-blur-sm shrink-0 relative z-20">
      {/* Logo / Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
          <Network size={14} className="text-white" />
        </div>
        <h1 className="text-sm font-semibold tracking-wide text-text-primary font-display">
          知识整合智能体
        </h1>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-border" />

      {/* Stats */}
      <div className="flex items-center gap-4">
        <Stat icon={<BookOpen size={12} />} label="教材" value={textbooks.length} suffix="本" />
        <Stat icon={<Network size={12} />} label="节点" value={nodes.length} />
        <Stat icon={<GitBranch size={12} />} label="关系" value={edges.length} />
        {decisions.length > 0 && (
          <Stat icon={<Activity size={12} />} label="决策" value={decisions.length} />
        )}
      </div>

      {/* Loading indicator */}
      {anyLoading && (
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
          <span className="text-[10px] text-accent-cyan font-mono">处理中</span>
        </div>
      )}

      {/* Version */}
      <div className="ml-auto text-[10px] text-text-muted font-mono">v1.0</div>
    </header>
  )
}

function Stat({ icon, label, value, suffix = '' }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-text-secondary">
      <span className="text-text-muted">{icon}</span>
      <span className="text-[10px]">{label}</span>
      <span className="text-xs font-mono font-medium text-text-primary">{value}</span>
      {suffix && <span className="text-[10px] text-text-muted">{suffix}</span>}
    </div>
  )
}
