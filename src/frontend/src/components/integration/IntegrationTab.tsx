import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import { Zap, ArrowRight, TrendingDown, GitMerge, Trash2, Shield, ChevronDown } from 'lucide-react'

export function IntegrationTab() {
  const { decisions, compressionRatio, setDecisions, setCompressionRatio, setGraphData, setLoading, loading, nodes, edges, mergeStats, setMergeStats, textbooks } = useStore()

  const handleMerge = async () => {
    setLoading('merge', true)
    try {
      const beforeNodes = nodes.length
      const beforeEdges = edges.length
      const result = await api.mergeGraphs()
      setCompressionRatio(result.compression_ratio)
      const merged = await api.getMerged()
      setGraphData(merged.nodes, merged.edges)
      setMergeStats({
        beforeNodes,
        beforeEdges,
        afterNodes: merged.nodes.length,
        afterEdges: merged.edges.length,
      })
      const decs = await api.getDecisions()
      setDecisions(decs)
    } finally {
      setLoading('merge', false)
    }
  }

  const mergeCount = decisions.filter(d => d.action === 'merge').length
  const removeCount = decisions.filter(d => d.action === 'remove').length
  const keepCount = decisions.filter(d => d.action === 'keep').length
  const total = decisions.length || 1

  return (
    <div className="flex flex-col gap-4">
      {/* Action button */}
      <button
        onClick={handleMerge}
        disabled={loading['merge']}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-blue to-accent-cyan text-white text-xs font-medium py-2.5 px-4 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {loading['merge'] ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            整合中...
          </>
        ) : (
          <>
            <Zap size={14} />
            执行跨教材整合
          </>
        )}
      </button>

      {/* Before / After comparison */}
      {mergeStats && (
        <div className="bg-surface/60 rounded-xl p-3.5 border border-border">
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-3">整合前后对比</div>
          <div className="flex items-center gap-3">
            {/* Before */}
            <div className="flex-1 text-center">
              <div className="text-[9px] text-text-muted mb-1">整合前</div>
              <div className="text-lg font-mono font-semibold text-text-primary">{mergeStats.beforeNodes}</div>
              <div className="text-[9px] text-text-muted">节点</div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight size={16} className="text-accent-blue" />
              <div className="text-[9px] font-mono text-accent-green">
                {((1 - mergeStats.afterNodes / Math.max(mergeStats.beforeNodes, 1)) * 100).toFixed(0)}%↓
              </div>
            </div>

            {/* After */}
            <div className="flex-1 text-center">
              <div className="text-[9px] text-text-muted mb-1">整合后</div>
              <div className="text-lg font-mono font-semibold text-accent-blue">{mergeStats.afterNodes}</div>
              <div className="text-[9px] text-text-muted">节点</div>
            </div>
          </div>

          {/* Compression ratio bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-text-muted">压缩比</span>
              <span className={`text-[11px] font-mono font-semibold ${compressionRatio <= 0.3 ? 'text-accent-green' : 'text-accent-amber'}`}>
                {(compressionRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-deep rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, compressionRatio * 100)}%`,
                  backgroundColor: compressionRatio <= 0.3 ? '#10b981' : '#f59e0b',
                }}
              />
            </div>
            <div className="text-[8px] text-text-muted mt-0.5 text-right">目标 ≤ 30%</div>
          </div>
        </div>
      )}

      {/* Decision distribution */}
      {decisions.length > 0 && (
        <div className="bg-surface/60 rounded-xl p-3.5 border border-border">
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2.5">决策分布</div>

          {/* Bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-deep mb-2.5">
            {mergeCount > 0 && (
              <div
                className="bg-accent-blue transition-all duration-500"
                style={{ width: `${(mergeCount / total) * 100}%` }}
              />
            )}
            {keepCount > 0 && (
              <div
                className="bg-accent-green transition-all duration-500"
                style={{ width: `${(keepCount / total) * 100}%` }}
              />
            )}
            {removeCount > 0 && (
              <div
                className="bg-accent-red transition-all duration-500"
                style={{ width: `${(removeCount / total) * 100}%` }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-3">
            <LegendItem color="#3b82f6" icon={<GitMerge size={8} />} label="合并" count={mergeCount} />
            <LegendItem color="#10b981" icon={<Shield size={8} />} label="保留" count={keepCount} />
            <LegendItem color="#ef4444" icon={<Trash2 size={8} />} label="删除" count={removeCount} />
          </div>
        </div>
      )}

      {/* Textbook coverage */}
      {textbooks.length > 0 && (
        <div className="bg-surface/60 rounded-xl p-3.5 border border-border">
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">教材覆盖 ({textbooks.length}/7)</div>
          <div className="flex flex-wrap gap-1">
            {textbooks.map(t => (
              <span key={t.id} className="text-[9px] px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Decision list */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
          整合决策 <span className="text-text-muted/60">({decisions.length})</span>
        </div>
        {decisions.length === 0 && (
          <div className="text-center py-6">
            <GitMerge size={20} className="mx-auto text-text-muted/20 mb-2" />
            <div className="text-[11px] text-text-muted">点击上方按钮执行整合</div>
          </div>
        )}
        {decisions.slice(0, 30).map((d) => (
          <div
            key={d.decision_id}
            className="bg-surface/40 hover:bg-surface/70 rounded-lg px-3 py-2 transition-colors border border-transparent hover:border-border"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${
                d.action === 'merge' ? 'bg-accent-blue/15 text-accent-blue' :
                d.action === 'remove' ? 'bg-accent-red/15 text-accent-red' :
                'bg-accent-green/15 text-accent-green'
              }`}>
                {d.action === 'merge' ? '合并' : d.action === 'remove' ? '删除' : '保留'}
              </span>
              <span className="text-[9px] text-text-muted font-mono flex-1 truncate">{d.affected_nodes.join(' ↔ ')}</span>
              <span className="text-[9px] text-text-muted font-mono">{(d.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed line-clamp-2">{d.reason}</p>
          </div>
        ))}
        {decisions.length > 30 && (
          <div className="text-[9px] text-text-muted text-center py-1">
            显示前 30 条，共 {decisions.length} 条
          </div>
        )}
      </div>
    </div>
  )
}

function LegendItem({ color, icon, label, count }: { color: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[9px] text-text-muted">{label}</span>
      <span className="text-[9px] font-mono text-text-secondary">{count}</span>
    </div>
  )
}
