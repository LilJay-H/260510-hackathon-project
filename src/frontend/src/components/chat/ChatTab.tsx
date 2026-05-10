import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'

const MODIFY_KEYWORDS = ['保留', '恢复', '删除', '分开', '拆分', '合并']

export function ChatTab() {
  const { chatMessages, addChatMessage, setGraphData } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [chatMessages])

  const refreshGraph = useCallback(async () => {
    try {
      const merged = await api.getMerged()
      if (merged.nodes) setGraphData(merged.nodes, merged.edges || [])
    } catch { /* graph may not exist yet */ }
  }, [setGraphData])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    addChatMessage({ role: 'user', content: msg })

    setLoading(true)
    try {
      const result = await api.chatSend(msg)
      addChatMessage({ role: 'assistant', content: result.response })
      // Refresh graph if this was a modification action
      if (MODIFY_KEYWORDS.some(k => msg.includes(k))) {
        await refreshGraph()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-auto flex flex-col gap-2 mb-3">
        {chatMessages.length === 0 && (
          <div className="text-xs text-gray-600 text-center mt-8">
            试试：「为什么把A和B合并了？」「保留X」「把X和Y分开」
          </div>
        )}
        {chatMessages.map((m, i) => (
          <div key={i} className={`text-xs p-2 rounded max-w-[90%] ${
            m.role === 'user'
              ? 'bg-blue-600/20 text-blue-200 self-end'
              : 'bg-gray-800 text-gray-200 self-start'
          }`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-600 self-start">思考中...</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="对话修改整合方案..."
          className="flex-1 bg-gray-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 border border-gray-700 focus:border-blue-500 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  )
}
