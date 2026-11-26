import { LangProvider } from './i18n'
import { useRoute } from './router'
import { Layout } from './components/Layout'
import { NetworkMap } from './map/NetworkMap'
import { SummaryPage } from './pages/Summary'
import { LinesPage } from './pages/Lines'
import { StationsPage } from './pages/Stations'
import { EngineeringPage } from './pages/Engineering'
import { FinancePage } from './pages/Finance'
import { RoadmapPage } from './pages/Roadmap'
import { EnvironmentPage } from './pages/Environment'
import { ReferencesPage } from './pages/References'
import { SubmissionPage } from './pages/Submission'
import { PrintMapPage } from './pages/PrintMap'
import { NotFound } from './pages/NotFound'

function Routes() {
  const { page, query } = useRoute()
  if (page === 'print-map') return <PrintMapPage />
  if (page === 'map') {
    return (
      <Layout page="map" full>
        <NetworkMap key={query.toString()} initialStation={query.get('station')} initialLine={query.get('line')} />
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
  return <Layout page={page}>{body}</Layout>
}

export default function App() {
  return <LangProvider><Routes /></LangProvider>
}
