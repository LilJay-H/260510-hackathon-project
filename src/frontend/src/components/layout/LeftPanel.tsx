import { useCallback, useState, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import { Upload, FileText, Sparkles } from 'lucide-react'

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
    <aside className="w-60 border-r border-border flex flex-col bg-surface shrink-0 overflow-hidden">
      {/* Upload area */}
      <div className="p-3 border-b border-border">
        <div className="text-[10px] font-medium text-text-faint uppercase tracking-wider mb-2">上传教材</div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`border border-dashed rounded p-4 text-center cursor-pointer transition-all duration-200 ${
            isUploading
              ? 'border-blue/50 bg-blue/5'
              : dragOver
                ? 'border-cyan/60 bg-cyan/5'
                : 'border-border hover:border-text-faint'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-blue font-medium">解析中</span>
              <span className="text-[10px] text-text-faint truncate max-w-[180px]">{uploadingFile}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload size={16} className="text-text-faint" />
              <span className="text-[11px] text-text-dim">拖拽或点击上传</span>
              <span className="text-[9px] text-text-faint">PDF / MD / TXT</span>
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
        <div className="text-[10px] font-medium text-text-faint uppercase tracking-wider mb-2">
          教材列表 <span className="text-text-faint">({textbooks.length})</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {textbooks.map((t) => {
            const ext = t.id.includes('.') ? t.id.split('.').pop()?.toUpperCase() : 'PDF'
            return (
              <div
                key={t.id}
                className="bg-raised rounded p-2.5 transition-colors duration-200 border border-border hover:border-blue/30"
              >
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded bg-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={12} className="text-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-text truncate">{t.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[8px] px-1 py-0 rounded bg-surface text-text-faint border border-border">{ext}</span>
                      <span className="text-[9px] text-text-faint font-mono">
                        {(t.total_chars / 10000).toFixed(1)}万字
                      </span>
                      <span className="text-[9px] text-text-faint">·</span>
                      <span className="text-[9px] text-text-faint font-mono">{t.chapters}章</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleExtract(t.id)}
                  disabled={loading['extract']}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] font-medium bg-blue/10 text-blue rounded py-1.5 hover:bg-blue/20 disabled:opacity-40 transition-colors duration-200"
                >
                  {loading['extract'] ? (
                    <>
                      <div className="w-3 h-3 border border-blue border-t-transparent rounded-full animate-spin" />
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
            )
          })}
          {textbooks.length === 0 && !isUploading && (
            <div className="text-center py-8">
              <FileText size={24} className="mx-auto text-text-faint/30 mb-2" />
              <div className="text-[11px] text-text-faint">暂无教材</div>
              <div className="text-[9px] text-text-faint/60 mt-1">上传 PDF/MD/TXT 开始</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-faint">图谱统计</span>
          <span className="font-mono text-text-dim">{nodes.length} 节点 · {edges.length} 关系</span>
        </div>
      </div>
    </aside>
  )
}
