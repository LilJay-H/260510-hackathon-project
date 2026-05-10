import { KnowledgeGraph } from '../graph/KnowledgeGraph'

export function CenterPanel() {
  return (
    <div className="flex-1 relative bg-gray-950 overflow-hidden">
      <KnowledgeGraph />
    </div>
  )
}
