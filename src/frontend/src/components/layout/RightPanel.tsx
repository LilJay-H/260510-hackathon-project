import { useStore } from '../../store/useStore'
import { IntegrationTab } from '../integration/IntegrationTab'
import { RAGTab } from '../rag/RAGTab'
import { ChatTab } from '../chat/ChatTab'
import { GitMerge, MessageSquare, HelpCircle } from 'lucide-react'

const TABS = [
  { id: 'integration', label: '整合', icon: GitMerge },
  { id: 'rag', label: 'RAG', icon: HelpCircle },
  { id: 'chat', label: '对话', icon: MessageSquare },
]

export function RightPanel() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <aside className="w-[360px] border-l border-border flex flex-col bg-surface shrink-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'text-blue'
                  : 'text-text-faint hover:text-text-dim'
              }`}
            >
              <Icon size={12} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'integration' && <IntegrationTab />}
        {activeTab === 'rag' && <RAGTab />}
        {activeTab === 'chat' && <ChatTab />}
      </div>
    </aside>
  )
}
