import { create } from 'zustand'
import type { Textbook, KnowledgeNode, KnowledgeEdge, IntegrationDecision, RAGResult, ChatMessage } from '../types'

interface Store {
  textbooks: Textbook[]
  setTextbooks: (t: Textbook[]) => void
  addTextbook: (t: Textbook) => void
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  setGraphData: (nodes: KnowledgeNode[], edges: KnowledgeEdge[]) => void
  decisions: IntegrationDecision[]
  setDecisions: (d: IntegrationDecision[]) => void
  compressionRatio: number
  setCompressionRatio: (r: number) => void
  selectedNode: KnowledgeNode | null
  setSelectedNode: (n: KnowledgeNode | null) => void
  activeTab: string
  setActiveTab: (t: string) => void
  ragResult: RAGResult | null
  setRAGResult: (r: RAGResult | null) => void
  chatMessages: ChatMessage[]
  addChatMessage: (m: ChatMessage) => void
  loading: Record<string, boolean>
  setLoading: (key: string, v: boolean) => void
}

export const useStore = create<Store>((set) => ({
  textbooks: [],
  setTextbooks: (textbooks) => set({ textbooks }),
  addTextbook: (t) => set((s) => ({ textbooks: [...s.textbooks, t] })),
  nodes: [],
  edges: [],
  setGraphData: (nodes, edges) => set({ nodes, edges }),
  decisions: [],
  setDecisions: (decisions) => set({ decisions }),
  compressionRatio: 1,
  setCompressionRatio: (compressionRatio) => set({ compressionRatio }),
  selectedNode: null,
  setSelectedNode: (selectedNode) => set({ selectedNode }),
  activeTab: 'integration',
  setActiveTab: (activeTab) => set({ activeTab }),
  ragResult: null,
  setRAGResult: (ragResult) => set({ ragResult }),
  chatMessages: [],
  addChatMessage: (m) => set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  loading: {},
  setLoading: (key, v) => set((s) => ({ loading: { ...s.loading, [key]: v } })),
}))
