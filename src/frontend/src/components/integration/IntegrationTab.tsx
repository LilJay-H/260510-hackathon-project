import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import { Zap, ArrowRight, GitMerge, Trash2, Shield } from 'lucide-react'

/**
 * 跨教材整合面板
 * 功能: 执行整合 + 前后对比 + 决策分布 + 决策列表
 * 样式: 圆角6px 卡片, 1px边框, shadow-sm, 进度条动画
 */
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
      {/* 主操作按钮: 蓝色实底, 圆角6px, shadow-sm */}
      <button
        onClick={handleMerge}
        disabled={loading['merge']}
        className="w-full flex items-center justify-center gap-2 bg-blue text-white text-base font-medium py-2.5 px-4 rounded-md hover:bg-blue/90 disabled:opacity-40 transition-all duration-200 shadow-sm"
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

      {/* 整合前后对比卡片 */}
      {mergeStats && (
        <div className="bg-raised rounded-md p-3.5 border border-border shadow-sm">
          <div className="text-xs font-medium text-text-faint uppercase tracking-wider mb-3">整合前后对比</div>
          <div className="flex items-center gap-3">
            {/* 整合前 */}
            <div className="flex-1 text-center">
              <div className="text-xs text-text-faint mb-1">整合前</div>
              <div className="text-lg font-mono font-semibold text-text">{mergeStats.beforeNodes}</div>
              <div className="text-xs text-text-faint">节点</div>
            </div>
            {/* 箭头 + 压缩率 */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight size={16} className="text-blue" />
              <div className="text-xs font-mono text-green">
                {((1 - mergeStats.afterNodes / Math.max(mergeStats.beforeNodes, 1)) * 100).toFixed(0)}%↓
              </div>
            </div>
            {/* 整合后 */}
            <div className="flex-1 text-center">
              <div className="text-xs text-text-faint mb-1">整合后</div>
              <div className="text-lg font-mono font-semibold text-blue">{mergeStats.afterNodes}</div>
              <div className="text-xs text-text-faint">节点</div>
            </div>
          </div>

          {/* 压缩比进度条 */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-faint">压缩比</span>
              <span className={`text-sm font-mono font-semibold ${compressionRatio <= 0.3 ? 'text-green' : 'text-amber'}`}>
                {(compressionRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, compressionRatio * 100)}%`,
                  backgroundColor: compressionRatio <= 0.3 ? '#10b981' : '#f59e0b',
                }}
              />
            </div>
            <div className="text-2xs text-text-faint mt-0.5 text-right">目标 ≤ 30%</div>
          </div>
        </div>
      )}

      {/* 决策分布可视化 */}
      {decisions.length > 0 && (
        <div className="bg-raised rounded-md p-3.5 border border-border shadow-sm">
          <div className="text-xs font-medium text-text-faint uppercase tracking-wider mb-2.5">决策分布</div>

          {/* 堆叠进度条 */}
          <div className="flex h-2 rounded-full overflow-hidden bg-bg mb-2.5">
            {mergeCount > 0 && (
              <div
                className="bg-blue transition-all duration-500"
                style={{ width: `${(mergeCount / total) * 100}%` }}
              />
            )}
            {keepCount > 0 && (
              <div
                className="bg-green transition-all duration-500"
                style={{ width: `${(keepCount / total) * 100}%` }}
              />
            )}
            {removeCount > 0 && (
              <div
                className="bg-red transition-all duration-500"
                style={{ width: `${(removeCount / total) * 100}%` }}
              />
            )}
          </div>

          {/* 图例 */}
          <div className="flex gap-3">
            <LegendItem color="#3b82f6" icon={<GitMerge size={8} />} label="合并" count={mergeCount} />
            <LegendItem color="#10b981" icon={<Shield size={8} />} label="保留" count={keepCount} />
            <LegendItem color="#ef4444" icon={<Trash2 size={8} />} label="删除" count={removeCount} />
          </div>
        </div>
      )}

      {/* 教材覆盖情况 */}
      {textbooks.length > 0 && (
        <div className="bg-raised rounded-md p-3.5 border border-border shadow-sm">
          <div className="text-xs font-medium text-text-faint uppercase tracking-wider mb-2">教材覆盖 ({textbooks.length}/7)</div>
          <div className="flex flex-wrap gap-1">
            {textbooks.map(t => (
              <span key={t.id} className="text-xs px-2 py-0.5 rounded bg-blue/10 text-blue border border-blue/20">
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 整合决策列表 */}
      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-medium text-text-faint uppercase tracking-wider">
          整合决策 <span className="text-text-faint/60">({decisions.length})</span>
        </div>
        {decisions.length === 0 && (
          <div className="text-center py-6">
            <GitMerge size={20} className="mx-auto text-text-faint/20 mb-2" />
            <div className="text-sm text-text-faint">点击上方按钮执行整合</div>
          </div>
        )}
        {decisions.slice(0, 30).map((d) => (
          /* 决策项: 圆角6px, hover高亮, 1px边框 */
          <div
            key={d.decision_id}
            className="bg-raised hover:bg-border rounded-md px-3 py-2 transition-colors duration-200 border border-transparent hover:border-border shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                d.action === 'merge' ? 'bg-blue/15 text-blue' :
                d.action === 'remove' ? 'bg-red/15 text-red' :
                'bg-green/15 text-green'
              }`}>
                {d.action === 'merge' ? '合并' : d.action === 'remove' ? '删除' : '保留'}
              </span>
              <span className="text-xs text-text-faint font-mono flex-1 truncate">{d.affected_nodes.join(' ↔ ')}</span>
              <span className="text-xs text-text-faint font-mono">{(d.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-text-faint mt-1 leading-relaxed line-clamp-2">{d.reason}</p>
          </div>
        ))}
        {decisions.length > 30 && (
          <div className="text-xs text-text-faint text-center py-1">
            显示前 30 条，共 {decisions.length} 条
          </div>
        )}
      </div>
    </div>
  )
}

/** 图例项: 圆点 + 标签 + 数量 */
function LegendItem({ color, icon, label, count }: { color: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-text-faint">{label}</span>
      <span className="text-xs font-mono text-text-dim">{count}</span>
    </div>
  )
}
