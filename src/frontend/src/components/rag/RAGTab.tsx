import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import ReactMarkdown from 'react-markdown'
import { Search, BookOpen, ExternalLink } from 'lucide-react'

export function RAGTab() {
  const { ragResult, setRAGResult } = useStore()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)

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
      {/* Search input */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="输入医学问题..."
          className="w-full bg-surface/60 rounded-lg pl-8 pr-16 py-2.5 text-[11px] text-text-primary placeholder-text-muted border border-border focus:border-accent-blue/50 focus:outline-none transition-colors"
        />
        <button
          onClick={handleQuery}
          disabled={loading || !question.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-accent-blue text-white text-[10px] font-medium px-3 py-1.5 rounded-md hover:bg-accent-blue/80 disabled:opacity-30 transition-opacity"
        >
          {loading ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          ) : '查询'}
        </button>
      </div>

      {/* Suggestions */}
      {!ragResult && !loading && (
        <div className="space-y-1.5">
          <div className="text-[9px] text-text-muted uppercase tracking-wider">试试这些问题</div>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => { setQuestion(s); }}
              className="w-full text-left text-[10px] text-text-secondary bg-surface/40 hover:bg-surface/70 rounded-md px-3 py-2 transition-colors border border-transparent hover:border-border"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-text-muted">检索中...</span>
        </div>
      )}

      {/* Result */}
      {ragResult && !loading && (
        <div className="flex flex-col gap-3 animate-slide-in-up">
          {/* Answer */}
          <div className="bg-surface/60 rounded-xl p-4 border border-border">
            <div className="text-[9px] text-text-muted uppercase tracking-wider mb-2">回答</div>
            <div className="text-[11px] text-text-secondary leading-relaxed">
              <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
            </div>
          </div>

          {/* Citations */}
          {ragResult.citations && ragResult.citations.length > 0 && (
            <div>
              <div className="text-[9px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                <BookOpen size={9} />
                引用来源 ({ragResult.citations.length})
              </div>
              <div className="space-y-1.5">
                {ragResult.citations.map((c, i) => (
                  <div
                    key={i}
                    className="bg-surface/40 rounded-lg px-3 py-2 border border-transparent hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-accent-blue font-mono">[{i + 1}]</span>
                      <span className="text-[10px] text-text-primary font-medium flex-1 truncate">{c.textbook}</span>
                      <span className="text-[9px] text-accent-green font-mono">{(c.relevance_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-[9px] text-text-muted mt-0.5 ml-5">
                      {c.chapter} · 第{c.page}页
                    </div>
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
