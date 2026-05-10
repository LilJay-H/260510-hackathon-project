export interface Textbook {
  id: string
  title: string
  chapters: number
  total_chars: number
}

export interface KnowledgeNode {
  id: string
  name: string
  definition: string
  category: string
  chapter: string
  page: number
  textbook_id: string
  textbook_name: string
}

export interface KnowledgeEdge {
  source: string
  target: string
  relation_type: string
  description: string
}

export interface IntegrationDecision {
  decision_id: string
  action: string
  affected_nodes: string[]
  result_node: string | null
  reason: string
  confidence: number
}

export interface RAGResult {
  answer: string
  citations: { textbook: string; chapter: string; page: number; relevance_score: number }[]
  source_chunks: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
