import { useStore } from '../../store/useStore'
import { api } from '../../api/client'

export function IntegrationTab() {
  const { decisions, compressionRatio, setDecisions, setCompressionRatio, setGraphData, setLoading, loading } = useStore()

  const handleMerge = async () => {
    setLoading('merge', true)
    try {
      const result = await api.mergeGraphs()
      setCompressionRatio(result.compression_ratio)
      const merged = await api.getMerged()
      setGraphData(merged.nodes, merged.edges)
      const decs = await api.getDecisions()
      setDecisions(decs)
    } finally {
      setLoading('merge', false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleMerge}
        disabled={loading['merge']}
        className="bg-blue-600 text-white text-xs py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading['merge'] ? '整合中...' : '执行跨教材整合'}
      </button>

      <div className="text-xs text-gray-400">
        压缩比: <span className="text-white font-mono">{(compressionRatio * 100).toFixed(1)}%</span>
        （目标 ≤ 30%）
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-gray-400">整合决策 ({decisions.length})</h3>
        {decisions.map((d) => (
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
      </div>
    </div>
  )
}
