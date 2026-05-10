import { useState, useMemo, useRef, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../../store/useStore'
import { NodeDetail } from './NodeDetail'
import type { ViewMode } from '../layout/CenterPanel'
import { Search, X, RotateCcw } from 'lucide-react'

/** 节点分类配色 — 7种知识类型对应不同颜色 */
const CATEGORY_COLORS: Record<string, string> = {
  '核心概念': '#3b82f6',
  '解剖结构': '#ef4444',
  '生理过程': '#10b981',
  '病理变化': '#f59e0b',
  '临床表现': '#8b5cf6',
  '诊断方法': '#06b6d4',
  '治疗原则': '#f97316',
}

/** 教材来源配色 — 用于"按教材"着色模式 */
const TEXTBOOK_COLORS: Record<string, string> = {
  '01_局部解剖学': '#3b82f6',
  '02_组织学与胚胎学': '#ef4444',
  '03_生理学': '#10b981',
  '04_医学微生物学': '#f59e0b',
  '05_病理学': '#8b5cf6',
  '06_传染病学': '#06b6d4',
  '07_病理生理学': '#f97316',
}
const TEXTBOOK_COLOR_LIST = Object.values(TEXTBOOK_COLORS)

/** 节点形状映射 — 不同分类使用不同图形 */
const CATEGORY_SYMBOLS: Record<string, string> = {
  '核心概念': 'circle',
  '解剖结构': 'roundRect',
  '生理过程': 'diamond',
  '病理变化': 'triangle',
  '临床表现': 'pin',
  '诊断方法': 'rect',
  '治疗原则': 'star',
}

/** 边关系类型配色 */
const RELATION_COLORS: Record<string, string> = {
  prerequisite: '#ef4444',   /* 前置依赖: 红色 */
  parallel: '#6b7280',       /* 并列关系: 灰色虚线 */
  contains: '#3b82f6',       /* 包含关系: 蓝色 */
  applies_to: '#10b981',     /* 应用关系: 绿色 */
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

/**
 * 知识图谱核心组件
 * 功能: ECharts力导向/树状图 + 搜索 + 分类筛选 + 着色模式切换
 * 交互: 节点点击查看详情, 缩放/拖拽, 高亮关联节点
 * 样式: 圆角6px 控制面板, 1px边框, shadow-sm
 */
export function KnowledgeGraph({ viewMode }: Props) {
  const { nodes, edges, setSelectedNode } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [colorMode, setColorMode] = useState<'category' | 'textbook'>('category')
  const chartRef = useRef<any>(null)

  /** 计算每个节点的连接度 */
  const degreeMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of edges) {
      map[e.source] = (map[e.source] || 0) + 1
      map[e.target] = (map[e.target] || 0) + 1
    }
    return map
  }, [edges])

  const allCategories = useMemo(() => [...new Set(nodes.map(n => n.category))], [nodes])

  /** 当未选择任何筛选时显示全部分类 */
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

  /** 过滤显示的节点 (最多300个) */
  const displayNodes = useMemo(() => {
    return nodes.slice(0, 300).filter(n => {
      if (!displayCategories.has(n.category)) return false
      if (searchTerm && !n.name.includes(searchTerm) && !n.definition.includes(searchTerm)) return false
      return true
    })
  }, [nodes, displayCategories, searchTerm])

  const nodeIds = new Set(displayNodes.map(n => n.id))

  /** 节点样式配置 — 大小随连接度和跨教材数动态调整 */
  const chartNodes = useMemo(() => {
    return displayNodes.map(n => {
      const degree = degreeMap[n.id] || 0
      const bookCount = (n as any).textbook_count || 1
      const isSearchMatch = searchTerm.length > 0 && (n.name.includes(searchTerm) || n.definition.includes(searchTerm))
      /* 节点大小 = 基础12 + 连接度*2.5 + 跨教材数*5, 上限55 */
      const baseSize = Math.min(55, 12 + degree * 2.5 + bookCount * 5)

      let nodeColor: string
      if (colorMode === 'textbook') {
        nodeColor = TEXTBOOK_COLORS[n.textbook_name] || TEXTBOOK_COLOR_LIST[0]
      } else {
        nodeColor = CATEGORY_COLORS[n.category] || '#6b7280'
      }

      return {
        ...n,
        symbolSize: baseSize,
        symbol: CATEGORY_SYMBOLS[n.category] || 'circle',
        name: n.name,
        itemStyle: {
          color: nodeColor,
          borderColor: isSearchMatch
            ? '#ffffff'
            : bookCount > 1
              ? '#f59e0b'
              : 'rgba(255,255,255,0.06)',
          borderWidth: isSearchMatch ? 3 : bookCount > 1 ? 2 : 1,
          shadowColor: isSearchMatch
            ? 'rgba(255,255,255,0.3)'
            : bookCount > 1
              ? 'rgba(245,158,11,0.2)'
              : 'rgba(0,0,0,0.2)',
          shadowBlur: isSearchMatch ? 12 : bookCount > 1 ? 8 : 4,
        },
        label: {
          show: true,
          fontSize: Math.max(8, Math.min(11, baseSize / 5)),
          color: '#c8d4e6',
          fontFamily: 'Inter, sans-serif',
          formatter: n.name.length > 6 ? n.name.slice(0, 5) + '…' : n.name,
        },
      }
    })
  }, [displayNodes, degreeMap, searchTerm, colorMode])

  const categories = allCategories.map(c => ({ name: c }))

  /** 边样式配置 — 根据关系类型设置颜色、线宽、虚实 */
  const chartEdges = useMemo(() => {
    return edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({
        source: e.source,
        target: e.target,
        lineStyle: {
          color: RELATION_COLORS[e.relation_type] || '#2a2e3a',
          width: e.relation_type === 'prerequisite' ? 2 : 1,
          curveness: e.relation_type === 'parallel' ? 0 : 0.15,
          type: e.relation_type === 'parallel' ? 'dashed' : 'solid',
        },
        edgeLabel: { show: false },
      }))
  }, [edges, nodeIds])

  /** ECharts 配置项 */
  const option = useMemo(() => {
    const base = {
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: '#1a1d27',
        borderColor: '#2a2e3a',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { fontSize: 11, fontFamily: 'Inter, sans-serif', color: '#e5e7eb' },
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
                <div style="display:inline-block;background:${catColor}22;color:${catColor};padding:1px 6px;border-radius:4px;font-size:9px;margin-bottom:4px;">${d.category}</div>
                <div style="font-size:10px;color:#9ca3af;line-height:1.4;">${def}</div>
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
        textStyle: { color: '#6b7280', fontSize: 9, fontFamily: 'Inter, sans-serif' },
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
            color: '#9ca3af',
            fontFamily: 'Inter, sans-serif',
          },
          lineStyle: { color: '#2a2e3a', width: 1 },
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
            shadowColor: 'rgba(59,130,246,0.4)',
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
      {/* === 左上角搜索和筛选控制面板 === */}
      {nodes.length > 0 && (
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {/* 搜索框: 圆角6px, 1px边框, shadow-sm */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜索知识点..."
              className="bg-raised border border-border rounded-md pl-7 pr-7 py-1.5 text-sm text-text placeholder-text-faint w-52 focus:border-blue/50 focus:outline-none transition-colors duration-200 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-dim"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* 分类筛选芯片组 */}
          <div className="flex flex-wrap gap-1">
            {allCategories.map(cat => {
              const color = CATEGORY_COLORS[cat] || '#6b7280'
              const isActive = displayCategories.has(cat)
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="text-xs px-1.5 py-0.5 rounded border transition-all duration-200"
                  style={{
                    borderColor: isActive ? color + '60' : '#2a2e3a',
                    backgroundColor: isActive ? color + '15' : '#222633',
                    color: isActive ? color : '#6b7280',
                  }}
                >
                  {cat}
                </button>
              )
            })}
            {(searchTerm || activeCategories.size > 0) && (
              <button
                onClick={resetFilters}
                className="text-xs px-1.5 py-0.5 rounded text-text-faint hover:text-text-dim flex items-center gap-0.5"
              >
                <RotateCcw size={8} />
                重置
              </button>
            )}
          </div>

          {/* 着色方式切换 */}
          <div className="bg-raised border border-border rounded-md px-2.5 py-1.5 shadow-sm">
            <div className="text-xs text-text-faint mb-1">着色方式</div>
            <div className="flex gap-1">
              <button
                onClick={() => setColorMode('category')}
                className={`text-xs px-2 py-0.5 rounded transition-all duration-200 ${
                  colorMode === 'category' ? 'bg-blue/15 text-blue' : 'text-text-faint hover:text-text-dim'
                }`}
              >
                按分类
              </button>
              <button
                onClick={() => setColorMode('textbook')}
                className={`text-xs px-2 py-0.5 rounded transition-all duration-200 ${
                  colorMode === 'textbook' ? 'bg-blue/15 text-blue' : 'text-text-faint hover:text-text-dim'
                }`}
              >
                按教材
              </button>
            </div>
          </div>

          {/* 关系类型图例 */}
          <div className="bg-raised border border-border rounded-md px-2.5 py-1.5 shadow-sm">
            <div className="text-xs text-text-faint mb-1">关系类型</div>
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
                  <span className="text-xs text-text-faint">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 教材来源图例 (仅在按教材着色时显示) */}
          {colorMode === 'textbook' && (
            <div className="bg-raised border border-border rounded-md px-2.5 py-1.5 shadow-sm">
              <div className="text-xs text-text-faint mb-1">教材来源</div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {Object.entries(TEXTBOOK_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-2xs text-text-faint">{name.replace(/^\d+_/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === 知识图谱画布 === */}
      {nodes.length > 0 ? (
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
          onEvents={onEvents}
          notMerge={true}
        />
      ) : (
        /* 空状态占位 */
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-raised border border-border flex items-center justify-center shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2a2e3a" strokeWidth="1.5">
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
            <div className="text-md text-text-dim font-medium">上传并提取教材</div>
            <div className="text-sm text-text-faint mt-1">知识图谱将在此显示</div>
          </div>
        </div>
      )}

      {/* === 节点详情侧边面板 === */}
      <NodeDetail />
    </div>
  )
}

/** 构建树状图数据结构 — 从扁平节点和边转换 */
function buildTreeData(nodes: any[], edges: any[]) {
  if (nodes.length === 0) return { name: 'empty', children: [] }

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
