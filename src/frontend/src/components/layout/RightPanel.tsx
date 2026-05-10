import { useStore } from '../../store/useStore'
import { IntegrationTab } from '../integration/IntegrationTab'
import { RAGTab } from '../rag/RAGTab'
import { ChatTab } from '../chat/ChatTab'

const TABS = [
  { id: 'integration', label: '整合' },
  { id: 'rag', label: 'RAG 问答' },
  { id: 'chat', label: '对话' },
]

export function RightPanel() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <aside className="w-96 border-l border-gray-800 flex flex-col bg-gray-900/50 shrink-0">
      <div className="flex border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'integration' && <IntegrationTab />}
        {activeTab === 'rag' && <RAGTab />}
        {activeTab === 'chat' && <ChatTab />}
      </div>
    </aside>
  )
}
