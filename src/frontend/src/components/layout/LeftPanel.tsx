import { useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'

export function LeftPanel() {
  const { textbooks, addTextbook, setGraphData, setLoading, nodes, edges, loading } = useStore()

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      setLoading('upload', true)
      try {
        const result = await api.uploadTextbook(file)
        addTextbook(result)
      } finally {
        setLoading('upload', false)
      }
    }
  }, [addTextbook, setLoading])

  const handleExtract = useCallback(async (id: string) => {
    setLoading('extract', true)
    try {
      await api.extractKnowledge(id)
      const allGraphs = await api.getAllGraphs()
      let allNodes: any[] = []
      let allEdges: any[] = []
      for (const tid of Object.keys(allGraphs as Record<string, any>)) {
        const g = await api.getGraph(tid)
        if (g.nodes) allNodes = [...allNodes, ...g.nodes]
        if (g.edges) allEdges = [...allEdges, ...g.edges]
      }
      setGraphData(allNodes, allEdges)
    } finally {
      setLoading('extract', false)
    }
  }, [setGraphData, setLoading])

  return (
    <aside className="w-60 border-r border-gray-800 p-4 flex flex-col gap-4 bg-gray-900/50 shrink-0 overflow-auto">
      <div>
        <label className="block text-xs text-gray-400 mb-2">上传教材</label>
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleUpload}
          className="block w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs cursor-pointer"
        />
      </div>

      <div className="flex-1 overflow-auto">
        <h3 className="text-xs font-semibold text-gray-400 mb-2">教材列表</h3>
        <div className="flex flex-col gap-2">
          {textbooks.map((t) => (
            <div key={t.id} className="bg-gray-800 rounded p-2 text-xs">
              <div className="font-medium text-white truncate">{t.title}</div>
              <div className="text-gray-500">{t.chapters} 章 | {(t.total_chars / 1000).toFixed(0)}k 字</div>
              <button
                onClick={() => handleExtract(t.id)}
                disabled={loading['extract']}
                className="mt-1 text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-600/40 disabled:opacity-50"
              >
                {loading['extract'] ? '提取中...' : '提取知识'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800 pt-3">
        <h3 className="text-xs font-semibold text-gray-400 mb-1">统计</h3>
        <div className="text-xs text-gray-500">节点: {nodes.length} | 边: {edges.length}</div>
      </div>
    </aside>
  )
}
