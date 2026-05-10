import { useState, useMemo, useRef, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../../store/useStore'
import { NodeDetail } from './NodeDetail'
import type { ViewMode } from '../layout/CenterPanel'
import { Search, X, Filter, RotateCcw } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  '核心概念': '#3b82f6',
  '解剖结构': '#ef4444',
  '生理过程': '#10b981',
  '病理变化': '#f59e0b',
  '临床表现': '#8b5cf6',
  '诊断方法': '#06b6d4',
  '治疗原则': '#f97316',
}

const CATEGORY_SYMBOLS: Record<string, string> = {
  '核心概念': 'circle',
  '解剖结构': 'roundRect',
  '生理过程': 'diamond',
  '病理变化': 'triangle',
  '临床表现': 'pin',
  '诊断方法': 'rect',
  '治疗原则': 'star',
}

const RELATION_COLORS: Record<string, string> = {
  prerequisite: '#ef4444',
  parallel: '#6b7280',
  contains: '#3b82f6',
  applies_to: '#10b981',
}

const RELATION_LABELS: Record<string, string> = {
  prerequisite: '前置',
  parallel: '并列',
  contains: '包含',
  applies_to: '应用',
}

interface Props {
  viewMode: ViewMode
}

export function KnowledgeGraph({ viewMode }: Props) {
  const { nodes, edges, setSelectedNode } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const chartRef = useRef<any>(null)

  const degreeMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of edges) {
      map[e.source] = (map[e.source] || 0) + 1
      map[e.target] = (map[e.target] || 0) + 1
    }
    return map
  }, [edges])

  const allCategories = useMemo(() => [...new Set(nodes.map(n => n.category))], [nodes])

  const displayCategories = activeCategories.size === 0 ? new Set(allCategories) : activeCategories

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev.size === 0 ? allCategories : prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const resetFilters = useCallback(() => {
    setActiveCategories(new Set())
    setSearchTerm('')
  }, [])

  const displayNodes = useMemo(() => {
    return nodes.slice(0, 300).filter(n => {
      if (!displayCategories.has(n.category)) return false
      if (searchTerm && !n.name.includes(searchTerm) && !n.definition.includes(searchTerm)) return false
      return true
    })
  }, [nodes, displayCategories, searchTerm])

  const nodeIds = new Set(displayNodes.map(n => n.id))

  const chartNodes = useMemo(() => {
    return displayNodes.map(n => {
      const degree = degreeMap[n.id] || 0
      const bookCount = (n as any).textbook_count || 1
      const isSearchMatch = searchTerm.length > 0 && (n.name.includes(searchTerm) || n.definition.includes(searchTerm))
      const baseSize = Math.min(55, 12 + degree * 2.5 + bookCount * 5)
      return {
        ...n,
        symbolSize: baseSize,
        symbol: CATEGORY_SYMBOLS[n.category] || 'circle',
        name: n.name,
        itemStyle: {
          color: CATEGORY_COLORS[n.category] || '#6b7280',
          borderColor: isSearchMatch
            ? '#ffffff'
            : bookCount > 1
              ? '#f59e0b'
              : 'rgba(255,255,255,0.08)',
          borderWidth: isSearchMatch ? 3 : bookCount > 1 ? 2 : 1,
          shadowColor: isSearchMatch
            ? 'rgba(255,255,255,0.4)'
            : bookCount > 1
              ? 'rgba(245,158,11,0.3)'
              : 'rgba(0,0,0,0.3)',
          shadowBlur: isSearchMatch ? 15 : bookCount > 1 ? 10 : 5,
        },
        label: {
          show: true,
          fontSize: Math.max(8, Math.min(11, baseSize / 5)),
          color: '#c8d4e6',
          fontFamily: 'Outfit, sans-serif',
          formatter: n.name.length > 6 ? n.name.slice(0, 5) + '…' : n.name,
        },
      }
    })
  }, [displayNodes, degreeMap, searchTerm])

  const categories = allCategories.map(c => ({ name: c }))

  const chartEdges = useMemo(() => {
    return edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({
        source: e.source,
        target: e.target,
        lineStyle: {
          color: RELATION_COLORS[e.relation_type] || '#2a3a56',
          width: e.relation_type === 'prerequisite' ? 2 : 1,
          curveness: e.relation_type === 'parallel' ? 0 : 0.15,
          type: e.relation_type === 'parallel' ? 'dashed' : 'solid',
        },
        edgeLabel: {
          show: false,
        },
      }))
  }, [edges, nodeIds])

  const option = useMemo(() => {
    const base = {
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: '#111827',
        borderColor: '#1e2d48',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { fontSize: 11, fontFamily: 'Outfit, sans-serif', color: '#e8edf5' },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const d = params.data
            const def = d.definition
              ? d.definition.slice(0, 100) + (d.definition.length > 100 ? '...' : '')
              : ''
            const bookCount = (d as any).textbook_count || 1
            const catColor = CATEGORY_COLORS[d.category] || '#6b7280'
            const freqBadge = bookCount > 1
              ? `<span style="display:inline-block;background:rgba(245,158,11,0.15);color:#f59e0b;padding:1px 6px;border-radius:4px;font-size:9px;margin-left:4px;">跨${bookCount}本</span>`
              : ''
            return `
              <div style="max-width:280px">
                <div style="font-size:12px;font-weight:600;margin-bottom:3px;">${d.name}${freqBadge}</div>
                <div style="display:inline-block;background:${catColor}22;color:${catColor};padding:1px 6px;border-radius:3px;font-size:9px;margin-bottom:4px;">${d.category}</div>
                <div style="font-size:10px;color:#8899b4;line-height:1.4;">${def}</div>
              </div>`
          }
          if (params.dataType === 'edge') {
            const e = params.data
            const label = RELATION_LABELS[e.relation_type] || e.relation_type
            const color = RELATION_COLORS[e.relation_type] || '#6b7280'
            return `<span style="color:${color};font-size:10px;">${label}</span>`
          }
          return ''
        },
      },
      legend: {
        data: categories.map(c => c.name),
        textStyle: { color: '#4a5d7a', fontSize: 9, fontFamily: 'Outfit, sans-serif' },
        bottom: 8,
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
      },
      animationDuration: 800,
      animationEasingUpdate: 'quinticInOut' as const,
    }

    if (viewMode === 'tree') {
      return {
        ...base,
        series: [{
          type: 'tree' as const,
          data: [buildTreeData(chartNodes, chartEdges)],
          top: 40,
          bottom: 40,
          left: 60,
          right: 120,
          orient: 'LR',
          symbolSize: 8,
          label: {
            fontSize: 9,
            color: '#8899b4',
            fontFamily: 'Outfit, sans-serif',
          },
          lineStyle: { color: '#1e2d48', width: 1 },
          leaves: {
            label: { fontSize: 9, color: '#c8d4e6' },
          },
          emphasis: {
            focus: 'descendant' as const,
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(59,130,246,0.3)' },
          },
        }],
      }
    }

    return {
      ...base,
      series: [{
        type: 'graph' as const,
        layout: 'force' as const,
        data: chartNodes,
        links: chartEdges,
        categories,
        roam: true,
        draggable: true,
        force: {
          repulsion: 120,
          edgeLength: 80,
          gravity: 0.1,
          layoutAnimation: true,
        },
        label: { show: true },
        lineStyle: { curveness: 0.15 },
        emphasis: {
          focus: 'adjacency' as const,
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(59,130,246,0.5)',
          },
          lineStyle: { width: 3 },
        },
        blur: {
          itemStyle: { opacity: 0.15 },
          lineStyle: { opacity: 0.05 },
        },
      }],
    }
  }, [chartNodes, chartEdges, categories, viewMode])

  const onChartClick = useCallback((params: any) => {
    if (params.dataType === 'node') {
      setSelectedNode(params.data)
    }
  }, [setSelectedNode])

  const onEvents = useMemo(() => ({ click: onChartClick }), [onChartClick])

  return (
    <div className="flex-1 relative h-full">
      {/* Search and filter bar */}
      {nodes.length > 0 && (
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 animate-slide-in-up">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜索知识点..."
              className="bg-abyss/80 backdrop-blur-sm border border-border rounded-lg pl-7 pr-7 py-1.5 text-[11px] text-text-primary placeholder-text-muted w-52 focus:border-accent-blue/50 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-1">
            {allCategories.map(cat => {
              const color = CATEGORY_COLORS[cat] || '#6b7280'
              const isActive = displayCategories.has(cat)
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="text-[9px] px-1.5 py-0.5 rounded-md border transition-all duration-150"
                  style={{
                    borderColor: isActive ? color + '60' : 'transparent',
                    backgroundColor: isActive ? color + '15' : 'rgba(26,34,54,0.6)',
                    color: isActive ? color : '#4a5d7a',
                  }}
                >
                  {cat}
                </button>
              )
            })}
            {(searchTerm || activeCategories.size > 0) && (
              <button
                onClick={resetFilters}
                className="text-[9px] px-1.5 py-0.5 rounded-md text-text-muted hover:text-text-secondary flex items-center gap-0.5"
              >
                <RotateCcw size={8} />
                重置
              </button>
            )}
          </div>

          {/* Edge legend */}
          <div className="bg-abyss/80 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5">
            <div className="text-[9px] text-text-muted mb-1">关系类型</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {Object.entries(RELATION_LABELS).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1">
                  <div
                    className="w-3 h-0.5 rounded"
                    style={{
                      backgroundColor: RELATION_COLORS[type],
                      borderTop: type === 'parallel' ? '1px dashed' : 'none',
                    }}
                  />
                  <span className="text-[9px] text-text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Graph */}
      {nodes.length > 0 ? (
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
          onEvents={onEvents}
          notMerge={true}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface/50 border border-border flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2a3a56" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <circle cx="5" cy="6" r="2" />
                <circle cx="19" cy="6" r="2" />
                <circle cx="5" cy="18" r="2" />
                <circle cx="19" cy="18" r="2" />
                <line x1="9.5" y1="10.5" x2="6.5" y2="7.5" />
                <line x1="14.5" y1="10.5" x2="17.5" y2="7.5" />
                <line x1="9.5" y1="13.5" x2="6.5" y2="16.5" />
                <line x1="14.5" y1="13.5" x2="17.5" y2="16.5" />
              </svg>
            </div>
            <div className="text-sm text-text-secondary font-medium">上传并提取教材</div>
            <div className="text-[11px] text-text-muted mt-1">知识图谱将在此显示</div>
          </div>
        </div>
      )}

      {/* Node detail panel */}
      <NodeDetail />
    </div>
  )
}

// Build tree data from flat nodes/edges
function buildTreeData(nodes: any[], edges: any[]) {
  if (nodes.length === 0) return { name: 'empty', children: [] }

  // Find root nodes (nodes with no incoming edges)
  const targetIds = new Set(edges.map(e => e.target))
  const roots = nodes.filter(n => !targetIds.has(n.id))
  if (roots.length === 0) roots.push(nodes[0])

  const childMap: Record<string, string[]> = {}
  for (const e of edges) {
    if (!childMap[e.source]) childMap[e.source] = []
    childMap[e.source].push(e.target)
  }

  const visited = new Set<string>()

  function buildNode(id: string): any {
    if (visited.has(id)) return null
    visited.add(id)
    const node = nodes.find(n => n.id === id)
    if (!node) return null
    const children = (childMap[id] || [])
      .map(cid => buildNode(cid))
      .filter(Boolean)
    return {
      name: node.name,
      itemStyle: { color: CATEGORY_COLORS[node.category] || '#6b7280' },
      children: children.length > 0 ? children : undefined,
    }
  }

  const treeChildren = roots.slice(0, 50).map(r => buildNode(r.id)).filter(Boolean)
  return {
    name: '知识图谱',
    children: treeChildren,
    itemStyle: { color: '#3b82f6' },
  }
}
