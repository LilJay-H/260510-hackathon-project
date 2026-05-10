import { useCallback, useState, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'

export function LeftPanel() {
  const { textbooks, addTextbook, setGraphData, setLoading, nodes, edges, loading } = useStore()
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doUpload = useCallback(async (file: File) => {
    setUploadingFile(file.name)
    setLoading('upload', true)
    try {
      const result = await api.uploadTextbook(file)
      addTextbook(result)
    } catch (e) {
      alert('上传失败: ' + (e as Error).message)
    } finally {
      setUploadingFile(null)
      setLoading('upload', false)
    }
  }, [addTextbook, setLoading])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      await doUpload(file)
    }
    e.target.value = ''
  }, [doUpload])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      /\.(pdf|md|txt)$/i.test(f.name)
    )
    for (const file of files) {
      await doUpload(file)
    }
  }, [doUpload])

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

  const isUploading = loading['upload']

  return (
    <aside className="w-60 border-r border-gray-800 p-4 flex flex-col gap-4 bg-gray-900/50 shrink-0 overflow-auto">
      {/* Upload area */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">上传教材</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isUploading
              ? 'border-blue-500 bg-blue-500/10'
              : dragOver
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-blue-400">解析中: {uploadingFile}</span>
              <span className="text-[10px] text-gray-500">文件越大耗时越长，请耐心等待</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg text-gray-500">+</span>
              <span className="text-xs text-gray-400">拖拽 PDF/MD/TXT 或点击选择</span>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.txt"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Textbook list */}
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
          {textbooks.length === 0 && !isUploading && (
            <div className="text-xs text-gray-600 text-center py-4">暂无教材</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-gray-800 pt-3">
        <h3 className="text-xs font-semibold text-gray-400 mb-1">统计</h3>
        <div className="text-xs text-gray-500">节点: {nodes.length} | 边: {edges.length}</div>
      </div>
    </aside>
  )
}
