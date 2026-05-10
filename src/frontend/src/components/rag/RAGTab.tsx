import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import ReactMarkdown from 'react-markdown'
import { Search, BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react'

/**
 * RAG 问答面板
 * 功能: 问题输入 + 推荐问题 + 检索结果 (回答/引用/原文片段)
 * 样式: 圆角6px 输入框/卡片, 1px边框, shadow-sm
 */
export function RAGTab() {
  const { ragResult, setRAGResult } = useStore()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null)

  const handleQuery = async () => {
    if (!question.trim()) return
    setLoading(true)
    try {
      const result = await api.ragQuery(question)
      setRAGResult(result)
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = [
    '什么是炎症？其基本病理变化有哪些？',
    '休克的发生机制和分期是什么？',
    '细菌感染和病毒感染的免疫应答区别？',
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* 搜索输入框: 圆角6px, 1px边框, focus时蓝色边框 */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="输入医学问题..."
          className="w-full bg-raised rounded-md pl-8 pr-16 py-2.5 text-sm text-text placeholder-text-faint border border-border focus:border-blue/50 focus:outline-none transition-colors duration-200 shadow-sm"
        />
        <button
          onClick={handleQuery}
          disabled={loading || !question.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-blue/80 disabled:opacity-30 transition-opacity duration-200"
        >
          {loading ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          ) : '查询'}
        </button>
      </div>

      {/* 推荐问题: 仅在无结果时显示 */}
      {!ragResult && !loading && (
        <div className="space-y-1.5">
          <div className="text-xs text-text-faint uppercase tracking-wider">试试这些问题</div>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => setQuestion(s)}
              className="w-full text-left text-xs text-text-dim bg-raised hover:bg-border rounded-md px-3 py-2 transition-colors duration-200 border border-transparent hover:border-border shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 加载动画 */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-2 border-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-faint">检索中...</span>
        </div>
      )}

      {/* 检索结果 */}
      {ragResult && !loading && (
        <div className="flex flex-col gap-3 animate-slide-in-up">
          {/* 回答卡片: 圆角6px, 1px边框, shadow-sm */}
          <div className="bg-raised rounded-md p-4 border border-border shadow-sm">
            <div className="text-xs text-text-faint uppercase tracking-wider mb-2">回答</div>
            <div className="text-sm text-text-dim leading-relaxed">
              <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
            </div>
          </div>

          {/* 引用来源列表 */}
          {ragResult.citations && ragResult.citations.length > 0 && (
            <div>
              <div className="text-xs text-text-faint uppercase tracking-wider mb-2 flex items-center gap-1">
                <BookOpen size={9} />
                引用来源 ({ragResult.citations.length})
              </div>
              <div className="space-y-1.5">
                {ragResult.citations.map((c, i) => (
                  /* 引用卡片: 显示教材名/章节/页码/相关度 */
                  <div
                    key={i}
                    className="bg-raised rounded-md px-3 py-2 border border-transparent hover:border-border transition-colors duration-200 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue font-mono">[{i + 1}]</span>
                      <span className="text-xs text-text font-medium flex-1 truncate">{c.textbook}</span>
                      <span className="text-xs text-green font-mono">{(c.relevance_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-text-faint mt-0.5 ml-5">
                      {c.chapter} · 第{c.page}页
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 原文片段: 可展开/折叠 */}
          {ragResult.source_chunks && ragResult.source_chunks.length > 0 && (
            <div>
              <div className="text-xs text-text-faint uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText size={9} />
                原文片段 ({ragResult.source_chunks.length})
              </div>
              <div className="space-y-1">
                {ragResult.source_chunks.map((chunk, i) => (
                  <div key={i} className="bg-raised rounded-md border border-border overflow-hidden shadow-sm">
                    <button
                      onClick={() => setExpandedChunk(expandedChunk === i ? null : i)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-border/50 transition-colors duration-200"
                    >
                      <span className="text-xs text-blue font-mono">chunk {i + 1}</span>
                      <span className="text-xs text-text-faint flex-1 truncate">
                        {chunk.slice(0, 50)}...
                      </span>
                      {expandedChunk === i ? <ChevronUp size={10} className="text-text-faint" /> : <ChevronDown size={10} className="text-text-faint" />}
                    </button>
                    {expandedChunk === i && (
                      <div className="px-3 pb-2 text-xs text-text-dim leading-relaxed border-t border-border pt-2">
                        {chunk}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
