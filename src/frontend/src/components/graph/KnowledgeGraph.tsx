import ReactECharts from 'echarts-for-react'
import { useStore } from '../../store/useStore'
import { NodeDetail } from './NodeDetail'

const CATEGORY_COLORS: Record<string, string> = {
  '核心概念': '#3b82f6',
  '解剖结构': '#ef4444',
  '生理过程': '#22c55e',
  '病理变化': '#eab308',
  '临床表现': '#a855f7',
  '诊断方法': '#06b6d4',
  '治疗原则': '#f97316',
}

const RELATION_COLORS: Record<string, string> = {
  prerequisite: '#ef4444',
  parallel: '#6b7280',
  contains: '#3b82f6',
  applies_to: '#22c55e',
}

export function KnowledgeGraph() {
  const { nodes, edges, setSelectedNode } = useStore()

  const displayNodes = nodes.slice(0, 200)
  const nodeIds = new Set(displayNodes.map((n) => n.id))

  const chartNodes = displayNodes.map((n) => ({
    ...n,
    symbolSize: 20,
    itemStyle: { color: CATEGORY_COLORS[n.category] || '#6b7280' },
  }))

  const categories = [...new Set(displayNodes.map((n) => n.category))].map((c) => ({ name: c }))

  const chartEdges = edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      lineStyle: { color: RELATION_COLORS[e.relation_type] || '#4b5563' },
    }))

  const option = {
    tooltip: { trigger: 'item' as const },
    legend: {
      data: categories.map((c) => c.name),
      textStyle: { color: '#9ca3af', fontSize: 10 },
      bottom: 10,
    },
    series: [{
      type: 'graph' as const,
      layout: 'force' as const,
      data: chartNodes,
      links: chartEdges,
      categories,
      roam: true,
      force: { repulsion: 100, edgeLength: 80 },
      label: { show: true, fontSize: 8, color: '#e5e7eb' },
      lineStyle: { curveness: 0.1 },
    }],
  }

  const onChartClick = (params: any) => {
    if (params.dataType === 'node') {
      setSelectedNode(params.data)
    }
  }

  return (
    <div className="flex-1 relative bg-gray-950">
      {nodes.length > 0 ? (
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          onEvents={{ click: onChartClick }}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-600 text-sm">
          上传并提取教材后，知识图谱将在此显示
        </div>
      )}
      <NodeDetail />
    </div>
  )
}
