import { useStore } from '../../store/useStore'
import { api } from '../../api/client'

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

  return (
    <div className="flex flex-col gap-4">
      {/* Action button */}
      <button
        onClick={handleMerge}
        disabled={loading['merge']}
        className="bg-blue-600 text-white text-xs py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading['merge'] ? '整合中...' : '执行跨教材整合'}
      </button>

      {/* Before / After comparison */}
      {mergeStats && (
        <div className="bg-gray-800 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">整合前后对比</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-gray-500">知识点</div>
              <div className="text-xs text-gray-400">{mergeStats.beforeNodes}</div>
              <div className="text-[10px] text-gray-600">→</div>
              <div className="text-sm text-white font-mono">{mergeStats.afterNodes}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">关系</div>
              <div className="text-xs text-gray-400">{mergeStats.beforeEdges}</div>
              <div className="text-[10px] text-gray-600">→</div>
              <div className="text-sm text-white font-mono">{mergeStats.afterEdges}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">压缩比</div>
              <div className={`text-sm font-mono ${compressionRatio <= 0.3 ? 'text-green-400' : 'text-yellow-400'}`}>
                {(compressionRatio * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-600">目标 ≤ 30%</div>
            </div>
          </div>
        </div>
      )}

      {/* Decision distribution */}
      {decisions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">决策分布</h3>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-[10px] text-gray-400">合并 {mergeCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-gray-400">删除 {removeCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] text-gray-400">保留 {keepCount}</span>
            </div>
          </div>
          {/* Simple bar chart */}
          <div className="mt-2 flex h-2 rounded overflow-hidden bg-gray-700">
            {mergeCount > 0 && <div className="bg-yellow-500" style={{ width: `${(mergeCount / decisions.length) * 100}%` }} />}
            {removeCount > 0 && <div className="bg-red-500" style={{ width: `${(removeCount / decisions.length) * 100}%` }} />}
            {keepCount > 0 && <div className="bg-green-500" style={{ width: `${(keepCount / decisions.length) * 100}%` }} />}
          </div>
        </div>
      )}

      {/* Textbook coverage */}
      {textbooks.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">教材覆盖 ({textbooks.length}/7)</h3>
          <div className="flex flex-wrap gap-1">
            {textbooks.map(t => (
              <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400">
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Decision list */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-gray-400">整合决策 ({decisions.length})</h3>
        {decisions.length === 0 && (
          <div className="text-xs text-gray-600">点击上方按钮执行跨教材整合</div>
        )}
        {decisions.slice(0, 50).map((d) => (
          <div key={d.decision_id} className="bg-gray-800 rounded p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                d.action === 'merge' ? 'bg-yellow-600/20 text-yellow-400' :
                d.action === 'remove' ? 'bg-red-600/20 text-red-400' :
                'bg-green-600/20 text-green-400'
              }`}>
                {d.action}
              </span>
              <span className="text-gray-500">{d.decision_id}</span>
              <span className="ml-auto text-gray-600">{(d.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-gray-400 mt-1">{d.reason}</p>
          </div>
        ))}
        {decisions.length > 50 && (
          <div className="text-[10px] text-gray-600 text-center">显示前 50 条，共 {decisions.length} 条</div>
        )}
      </div>
    </div>
  )
}
