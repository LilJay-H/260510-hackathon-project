import { Header } from './components/layout/Header'
import { LeftPanel } from './components/layout/LeftPanel'
import { CenterPanel } from './components/layout/CenterPanel'
import { RightPanel } from './components/layout/RightPanel'
import { StatusBar } from './components/layout/StatusBar'

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  )
}
