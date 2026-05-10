import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import { Send, Bot, User } from 'lucide-react'

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
      if (MODIFY_KEYWORDS.some(k => msg.includes(k))) {
        await refreshGraph()
      }
    } finally {
      setLoading(false)
    }
  }

  const QUICK_ACTIONS = [
    '为什么合并了？',
    '保留',
    '拆分',
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto flex flex-col gap-2 mb-3">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 rounded bg-raised border border-border flex items-center justify-center">
              <Bot size={18} className="text-text-faint/40" />
            </div>
            <div className="text-center">
              <div className="text-[11px] text-text-dim">对话修改整合方案</div>
              <div className="text-[9px] text-text-faint mt-1">支持保留、删除、拆分、合并等操作</div>
            </div>
            <div className="flex gap-1.5">
              {QUICK_ACTIONS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setInput(a)}
                  className="text-[9px] px-2 py-1 rounded bg-raised text-text-faint hover:text-text-dim hover:bg-border border border-border transition-colors duration-200"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-slide-in-up`}
          >
            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
              m.role === 'user'
                ? 'bg-blue/15'
                : 'bg-raised border border-border'
            }`}>
              {m.role === 'user'
                ? <User size={10} className="text-blue" />
                : <Bot size={10} className="text-text-faint" />
              }
            </div>
            <div className={`text-[11px] px-3 py-2 rounded max-w-[85%] leading-relaxed ${
              m.role === 'user'
                ? 'bg-blue/10 text-blue/90 rounded-tr-sm'
                : 'bg-raised text-text-dim rounded-tl-sm border border-border'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-raised border border-border flex items-center justify-center">
              <Bot size={10} className="text-text-faint" />
            </div>
            <div className="bg-raised border border-border rounded rounded-tl-sm px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-text-faint animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-text-faint animate-pulse" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-text-faint animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="对话修改整合方案..."
          className="flex-1 bg-raised rounded px-3 py-2 text-[11px] text-text placeholder-text-faint border border-border focus:border-blue/50 focus:outline-none transition-colors duration-200"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue text-white text-[11px] px-3 py-2 rounded hover:bg-blue/80 disabled:opacity-30 transition-opacity duration-200 flex items-center gap-1"
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  )
}
