import { useStore } from '../../store/useStore'

export function NodeDetail() {
  const { selectedNode, setSelectedNode } = useStore()

  if (!selectedNode) return null

  return (
    <div className="absolute right-0 top-0 w-80 h-full bg-gray-900 border-l border-gray-700 p-4 z-10 overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-white">{selectedNode.name}</h3>
        <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white text-xs">关闭</button>
      </div>
      <div className="space-y-2 text-xs">
        <div><span className="text-gray-500">分类:</span> <span className="text-gray-300">{selectedNode.category}</span></div>
        <div><span className="text-gray-500">教材:</span> <span className="text-gray-300">{selectedNode.textbook_name}</span></div>
        <div><span className="text-gray-500">章节:</span> <span className="text-gray-300">{selectedNode.chapter}</span></div>
        <div><span className="text-gray-500">页码:</span> <span className="text-gray-300">{selectedNode.page}</span></div>
        <div className="mt-3">
          <span className="text-gray-500">定义:</span>
          <p className="text-gray-300 mt-1 leading-relaxed">{selectedNode.definition}</p>
        </div>
      </div>
    </div>
  )
}
