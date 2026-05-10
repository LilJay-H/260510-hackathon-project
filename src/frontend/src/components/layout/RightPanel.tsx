import { useStore } from '../../store/useStore'
import { IntegrationTab } from '../integration/IntegrationTab'
import { RAGTab } from '../rag/RAGTab'
import { ChatTab } from '../chat/ChatTab'
import { GitMerge, MessageSquare, HelpCircle } from 'lucide-react'

const TABS = [
  { id: 'integration', label: '整合', icon: GitMerge },
  { id: 'rag', label: 'RAG 问答', icon: HelpCircle },
  { id: 'chat', label: '对话', icon: MessageSquare },
]

export function RightPanel() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <aside className="w-96 border-l border-border flex flex-col bg-abyss/60 shrink-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-abyss/40">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-all duration-150 relative ${
                activeTab === tab.id
                  ? 'text-accent-blue'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon size={12} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent-blue rounded-full" />
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
