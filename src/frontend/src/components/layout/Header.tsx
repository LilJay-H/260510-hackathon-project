import { useStore } from '../../store/useStore'

export function Header() {
  const { textbooks, nodes, edges } = useStore()
  return (
    <header className="h-12 border-b border-gray-800 flex items-center px-4 gap-6 bg-gray-900 shrink-0">
      <h1 className="text-sm font-bold tracking-wide text-white">学科知识整合智能体</h1>
      <span className="text-xs text-gray-400">教材 {textbooks.length} 本</span>
      <span className="text-xs text-gray-400">节点 {nodes.length}</span>
      <span className="text-xs text-gray-400">边 {edges.length}</span>
    </header>
  )
}
