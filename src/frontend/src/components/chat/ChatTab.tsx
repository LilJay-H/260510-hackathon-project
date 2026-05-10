import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import { Send, Bot, User, RefreshCw } from 'lucide-react'

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
            <div className="w-10 h-10 rounded-xl bg-surface/50 border border-border flex items-center justify-center">
              <Bot size={18} className="text-text-muted/40" />
            </div>
            <div className="text-center">
              <div className="text-[11px] text-text-secondary">对话修改整合方案</div>
              <div className="text-[9px] text-text-muted mt-1">支持保留、删除、拆分、合并等操作</div>
            </div>
            <div className="flex gap-1.5">
              {QUICK_ACTIONS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setInput(a)}
                  className="text-[9px] px-2 py-1 rounded-md bg-surface/50 text-text-muted hover:text-text-secondary hover:bg-surface border border-border transition-colors"
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
            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
              m.role === 'user'
                ? 'bg-accent-blue/15'
                : 'bg-surface/80 border border-border'
            }`}>
              {m.role === 'user'
                ? <User size={10} className="text-accent-blue" />
                : <Bot size={10} className="text-text-muted" />
              }
            </div>
            <div className={`text-[11px] px-3 py-2 rounded-lg max-w-[85%] leading-relaxed ${
              m.role === 'user'
                ? 'bg-accent-blue/10 text-accent-blue/90 rounded-tr-sm'
                : 'bg-surface/60 text-text-secondary rounded-tl-sm border border-border'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-md bg-surface/80 border border-border flex items-center justify-center">
              <Bot size={10} className="text-text-muted" />
            </div>
            <div className="bg-surface/60 border border-border rounded-lg rounded-tl-sm px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '0.3s' }} />
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
          className="flex-1 bg-surface/60 rounded-lg px-3 py-2 text-[11px] text-text-primary placeholder-text-muted border border-border focus:border-accent-blue/50 focus:outline-none transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-accent-blue text-white text-[11px] px-3 py-2 rounded-lg hover:bg-accent-blue/80 disabled:opacity-30 transition-opacity flex items-center gap-1"
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  )
}
