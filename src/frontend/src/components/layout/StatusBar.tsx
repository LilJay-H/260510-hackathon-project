import { useStore } from '../../store/useStore'

export function StatusBar() {
  const { loading, compressionRatio } = useStore()
  const anyLoading = Object.values(loading).some(Boolean)

  return (
    <footer className="h-7 border-t border-gray-800 flex items-center px-4 gap-4 bg-gray-900 text-xs text-gray-500 shrink-0">
      <span>{anyLoading ? '处理中...' : '就绪'}</span>
      <span>压缩比: {(compressionRatio * 100).toFixed(0)}%</span>
      <span className="ml-auto">学科知识整合智能体 v1.0</span>
    </footer>
  )
}
