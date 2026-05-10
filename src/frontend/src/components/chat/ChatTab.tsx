import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import { Send, Bot, User } from 'lucide-react'

/** 对话式修改操作关键词 — 检测到这些词时自动刷新图谱 */
const MODIFY_KEYWORDS = ['保留', '恢复', '删除', '分开', '拆分', '合并']

/**
 * 对话修改面板
 * 功能: 气泡式对话 + 快捷操作 + 图谱自动刷新
 * 样式: 用户消息蓝色右侧, AI消息灰色左侧, 圆角6px 气泡, shadow-sm
 */
export function ChatTab() {
  const { chatMessages, addChatMessage, setGraphData } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  /** 新消息自动滚到底部 */
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [chatMessages])

  /** 修改操作后刷新图谱数据 */
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

  /** 快捷操作按钮 */
  const QUICK_ACTIONS = [
    '为什么合并了？',
    '保留',
    '拆分',
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表区域 */}
      <div ref={scrollRef} className="flex-1 overflow-auto flex flex-col gap-2 mb-3">
        {/* 空状态: 引导提示 */}
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 rounded-lg bg-raised border border-border flex items-center justify-center shadow-sm">
              <Bot size={18} className="text-text-faint/40" />
            </div>
            <div className="text-center">
              <div className="text-sm text-text-dim">对话修改整合方案</div>
              <div className="text-xs text-text-faint mt-1">支持保留、删除、拆分、合并等操作</div>
            </div>
            {/* 快捷操作按钮组 */}
            <div className="flex gap-1.5">
              {QUICK_ACTIONS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setInput(a)}
                  className="text-xs px-2 py-1 rounded bg-raised text-text-faint hover:text-text-dim hover:bg-border border border-border transition-colors duration-200 shadow-sm"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 消息气泡 */}
        {chatMessages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-slide-in-up`}
          >
            {/* 头像: 用户蓝色, AI灰色 */}
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
            {/* 气泡: 用户蓝色右侧, AI灰色左侧, 圆角6px */}
            <div className={`text-sm px-3 py-2 rounded-md max-w-[85%] leading-relaxed ${
              m.role === 'user'
                ? 'bg-blue/10 text-blue/90 rounded-tr-sm'
                : 'bg-raised text-text-dim rounded-tl-sm border border-border shadow-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {/* AI 正在输入动画: 三个跳动圆点 */}
        {loading && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-raised border border-border flex items-center justify-center">
              <Bot size={10} className="text-text-faint" />
            </div>
            <div className="bg-raised border border-border rounded-md rounded-tl-sm px-3 py-2 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-text-faint animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-text-faint animate-pulse" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-text-faint animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域: 圆角6px 输入框 + 发送按钮 */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="对话修改整合方案..."
          className="flex-1 bg-raised rounded-md px-3 py-2 text-sm text-text placeholder-text-faint border border-border focus:border-blue/50 focus:outline-none transition-colors duration-200 shadow-sm"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue text-white text-sm px-3 py-2 rounded-md hover:bg-blue/80 disabled:opacity-30 transition-opacity duration-200 flex items-center gap-1 shadow-sm"
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  )
}
