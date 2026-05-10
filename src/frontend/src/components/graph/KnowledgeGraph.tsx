import { useState, useMemo } from 'react'
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

const CATEGORY_SYMBOLS: Record<string, string> = {
  '核心概念': 'circle',
  '解剖结构': 'rect',
  '生理过程': 'diamond',
  '病理变化': 'triangle',
  '临床表现': 'pin',
  '诊断方法': 'roundRect',
  '治疗原则': 'star',
}

const RELATION_COLORS: Record<string, string> = {
  prerequisite: '#ef4444',
  parallel: '#6b7280',
  contains: '#3b82f6',
  applies_to: '#22c55e',
}

export function KnowledgeGraph() {
  const { nodes, edges, setSelectedNode } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())

  // Calculate node degree (number of connections)
  const degreeMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of edges) {
      map[e.source] = (map[e.source] || 0) + 1
      map[e.target] = (map[e.target] || 0) + 1
    }
    return map
  }, [edges])

  const allCategories = useMemo(() => [...new Set(nodes.map(n => n.category))], [nodes])

  // Initialize filter to show all
  const displayCategories = activeCategories.size === 0 ? new Set(allCategories) : activeCategories

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev.size === 0 ? allCategories : prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const displayNodes = useMemo(() => {
    return nodes.slice(0, 200).filter(n => {
      if (!displayCategories.has(n.category)) return false
      if (searchTerm && !n.name.includes(searchTerm) && !n.definition.includes(searchTerm)) return false
      return true
    })
  }, [nodes, displayCategories, searchTerm])

  const nodeIds = new Set(displayNodes.map(n => n.id))
  const searchLower = searchTerm.toLowerCase()

  const chartNodes = displayNodes.map(n => {
    const degree = degreeMap[n.id] || 0
    const isSearchMatch = searchTerm && (n.name.includes(searchTerm) || n.definition.includes(searchTerm))
    return {
      ...n,
      symbolSize: Math.min(50, 10 + degree * 3),
      symbol: CATEGORY_SYMBOLS[n.category] || 'circle',
      itemStyle: {
        color: CATEGORY_COLORS[n.category] || '#6b7280',
        borderColor: isSearchMatch ? '#ffffff' : undefined,
        borderWidth: isSearchMatch ? 3 : 0,
      },
    }
  })

  const categories = allCategories.map(c => ({ name: c }))

  const chartEdges = edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(e => ({
      source: e.source,
      target: e.target,
      lineStyle: { color: RELATION_COLORS[e.relation_type] || '#4b5563' },
    }))

  const option = {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const d = params.data
          const def = d.definition ? d.definition.slice(0, 80) + (d.definition.length > 80 ? '...' : '') : ''
          return `<b>${d.name}</b><br/><span style="color:#9ca3af">${d.category}</span><br/>${def}`
        }
        return ''
      },
    },
    legend: {
      data: categories.map(c => c.name),
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
      {/* Search and filter bar */}
      {nodes.length > 0 && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索节点..."
            className="bg-gray-800/90 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 w-48 focus:border-blue-500 outline-none"
          />
          <div className="flex flex-wrap gap-1">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  displayCategories.has(cat)
                    ? 'border-gray-500 text-white'
                    : 'border-gray-700 text-gray-600'
                }`}
                style={{ borderColor: displayCategories.has(cat) ? CATEGORY_COLORS[cat] : undefined }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

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
