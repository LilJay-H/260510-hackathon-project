import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import ReactMarkdown from 'react-markdown'

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="输入医学问题..."
          className="flex-1 bg-gray-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 border border-gray-700 focus:border-blue-500 outline-none"
        />
        <button
          onClick={handleQuery}
          disabled={loading}
          className="bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : '查询'}
        </button>
      </div>

      {ragResult && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-800 rounded p-3 text-xs text-gray-200 leading-relaxed">
            <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-2">引用来源</h4>
            {ragResult.citations.map((c, i) => (
              <div key={i} className="text-xs text-gray-500 mb-1">
                [{c.textbook}, {c.chapter}, 第{c.page}页] 相关度: {(c.relevance_score * 100).toFixed(0)}%
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
