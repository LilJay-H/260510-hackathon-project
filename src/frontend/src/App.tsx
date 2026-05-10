import { Header } from './components/layout/Header'
import { LeftPanel } from './components/layout/LeftPanel'
import { CenterPanel } from './components/layout/CenterPanel'
import { RightPanel } from './components/layout/RightPanel'
import { StatusBar } from './components/layout/StatusBar'

/**
 * App 根组件
 * 布局: 固定三栏 (左240px + 中自适应 + 右360px) + 48px顶部 + 24px底部
 * 所有面板独立滚动，互不影响
 */
export default function App() {
  return (
    <div className="h-screen flex flex-col bg-bg text-text">
      {/* 48px 顶部导航栏 */}
      <Header />
      {/* 三栏主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左栏: 教材管理 (240px) */}
        <LeftPanel />
        {/* 中栏: 知识图谱 (自适应) */}
        <CenterPanel />
        {/* 右栏: Tab切换面板 (360px) */}
        <RightPanel />
      </div>
      {/* 24px 底部状态栏 */}
      <StatusBar />
    </div>
  )
}
