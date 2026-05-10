import { useCallback, useState, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import { Upload, FileText, Cpu, ChevronRight, Sparkles } from 'lucide-react'

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
    <aside className="w-64 border-r border-border flex flex-col bg-abyss/60 shrink-0 overflow-hidden">
      {/* Upload area */}
      <div className="p-3 border-b border-border">
        <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">上传教材</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`relative border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200 ${
            isUploading
              ? 'border-accent-blue/50 bg-accent-blue/5'
              : dragOver
                ? 'border-accent-cyan/60 bg-accent-cyan/5 scale-[1.02]'
                : 'border-border hover:border-border-bright hover:bg-surface/50'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-accent-blue font-medium">解析中</span>
              <span className="text-[10px] text-text-muted truncate max-w-[180px]">{uploadingFile}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload size={18} className="text-text-muted" />
              <span className="text-[11px] text-text-secondary">拖拽或点击上传</span>
              <span className="text-[9px] text-text-muted">PDF / MD / TXT</span>
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
      <div className="flex-1 overflow-auto p-3">
        <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">
          教材列表 <span className="text-text-muted">({textbooks.length})</span>
        </label>
        <div className="flex flex-col gap-1.5">
          {textbooks.map((t) => (
            <div
              key={t.id}
              className="group bg-surface/60 hover:bg-raised/80 rounded-lg p-2.5 transition-colors duration-150 border border-transparent hover:border-border"
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-accent-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText size={12} className="text-accent-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-text-primary truncate">{t.title}</div>
                  <div className="text-[10px] text-text-muted mt-0.5 font-mono">
                    {t.chapters} 章 · {(t.total_chars / 1000).toFixed(0)}k 字
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleExtract(t.id)}
                disabled={loading['extract']}
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] font-medium bg-accent-blue/10 text-accent-blue px-2 py-1.5 rounded-md hover:bg-accent-blue/20 disabled:opacity-40 transition-colors"
              >
                {loading['extract'] ? (
                  <>
                    <div className="w-3 h-3 border border-accent-blue border-t-transparent rounded-full animate-spin" />
                    提取中...
                  </>
                ) : (
                  <>
                    <Sparkles size={10} />
                    提取知识
                  </>
                )}
              </button>
            </div>
          ))}
          {textbooks.length === 0 && !isUploading && (
            <div className="text-center py-8">
              <FileText size={24} className="mx-auto text-text-muted/30 mb-2" />
              <div className="text-[11px] text-text-muted">暂无教材</div>
              <div className="text-[9px] text-text-muted/60 mt-1">上传 PDF/MD/TXT 开始</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-muted">图谱统计</span>
          <span className="font-mono text-text-secondary">{nodes.length} 节点 · {edges.length} 关系</span>
        </div>
      </div>
    </aside>
  )
}
