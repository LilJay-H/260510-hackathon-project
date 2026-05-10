import { useStore } from '../../store/useStore'
import { IntegrationTab } from '../integration/IntegrationTab'
import { RAGTab } from '../rag/RAGTab'
import { ChatTab } from '../chat/ChatTab'
import { GitMerge, MessageSquare, HelpCircle } from 'lucide-react'

/** 右侧面板标签页定义 */
const TABS = [
  { id: 'integration', label: '整合', icon: GitMerge },
  { id: 'rag', label: 'RAG', icon: HelpCircle },
  { id: 'chat', label: '对话', icon: MessageSquare },
]

/**
 * 右侧面板 — w-[360px] (360px)
 * 功能: Tab 切换 (整合/RAG/对话)
 * 样式: bg-surface, 1px border-left, 圆角6px Tab指示器
 * 响应式: 通过 responsive-right-panel class 在小屏收窄
 */
export function RightPanel() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <aside className="responsive-right-panel w-[360px] border-l border-border flex flex-col bg-surface shrink-0 overflow-hidden">
      {/* Tab 栏: 底部 2px 蓝色指示线 */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'text-blue'
                  : 'text-text-faint hover:text-text-dim'
              }`}
            >
              <Icon size={12} />
              {tab.label}
              {/* 活跃Tab底部指示线 */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab 内容区域: 独立滚动 */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'integration' && <IntegrationTab />}
        {activeTab === 'rag' && <RAGTab />}
        {activeTab === 'chat' && <ChatTab />}
      </div>
    </aside>
  )
}
