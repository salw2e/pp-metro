import { lazy, Suspense } from 'react'
import { LangProvider } from './i18n'
import { useRoute } from './router'
import { Layout } from './components/Layout'
import { SummaryPage } from './pages/Summary'
import { NotFound } from './pages/NotFound'

// the map library is large, so map pages and the heavier report pages load on demand
const NetworkMap = lazy(() => import('./map/NetworkMap').then(m => ({ default: m.NetworkMap })))
const LinesPage = lazy(() => import('./pages/Lines').then(m => ({ default: m.LinesPage })))
const StationsPage = lazy(() => import('./pages/Stations').then(m => ({ default: m.StationsPage })))
const EngineeringPage = lazy(() => import('./pages/Engineering').then(m => ({ default: m.EngineeringPage })))
const FinancePage = lazy(() => import('./pages/Finance').then(m => ({ default: m.FinancePage })))
const RoadmapPage = lazy(() => import('./pages/Roadmap').then(m => ({ default: m.RoadmapPage })))
const EnvironmentPage = lazy(() => import('./pages/Environment').then(m => ({ default: m.EnvironmentPage })))
const ReferencesPage = lazy(() => import('./pages/References').then(m => ({ default: m.ReferencesPage })))
const SubmissionPage = lazy(() => import('./pages/Submission').then(m => ({ default: m.SubmissionPage })))
const PrintMapPage = lazy(() => import('./pages/PrintMap').then(m => ({ default: m.PrintMapPage })))

const Loading = () => <div className="p-8 text-muted text-[14px]" role="status">Loading</div>

function Routes() {
  const { page, query } = useRoute()
  if (page === 'print-map') return <Suspense fallback={<Loading />}><PrintMapPage /></Suspense>
  if (page === 'map') {
    return (
      <Layout page="map" full>
        <Suspense fallback={<Loading />}>
          <NetworkMap key={query.toString()} initialStation={query.get('station')} initialLine={query.get('line')} />
        </Suspense>
      </Layout>
    )
  }
  const body = {
    summary: <SummaryPage />,
    lines: <LinesPage />,
    stations: <StationsPage />,
    engineering: <EngineeringPage />,
    finance: <FinancePage />,
    roadmap: <RoadmapPage />,
    environment: <EnvironmentPage />,
    references: <ReferencesPage />,
    submission: <SubmissionPage />,
    'print-report': <SubmissionPage />,
    'not-found': <NotFound />,
  }[page]
  return <Layout page={page}><Suspense fallback={<Loading />}>{body}</Suspense></Layout>
}

export default function App() {
  return <LangProvider><Routes /></LangProvider>
}
