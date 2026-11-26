import { Printer } from 'lucide-react'
import { useLang } from '../i18n'
import { lines, km, metroTotals } from '../data/network'
import { PreviewMap } from '../map/PreviewMap'
import { Legend } from '../map/NetworkMap'
import { LineMark, Button } from '../components/ui'

function Sheet() {
  const { t } = useLang()
  const m = metroTotals()
  return (
    <div className="a3 bg-white">
      <style>{`@media print { @page { size: A3 landscape; margin: 10mm; } } .a3 { width: 100%; max-width: 1580px; margin: 0 auto; }`}</style>
      <div className="no-print flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
        <span className="text-[13px] text-muted">A3 landscape network map. Use the browser print dialog with "Background graphics" enabled.</span>
        <Button variant="primary" onClick={() => print()}><Printer size={15} aria-hidden="true" />{t('common.print')}</Button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_330px] gap-4 p-4" style={{ minHeight: '90vh' }}>
        <div className="flex flex-col min-w-0">
          <div className="border-b-2 border-navy-900 pb-2 mb-3">
            <h1 className="text-[22px] font-semibold text-navy-900 leading-tight">{t('title')}</h1>
            <p className="text-[13px] text-muted">{t('subtitle')}. {t('status')}</p>
          </div>
          <PreviewMap height="calc(90vh - 90px)" print />
        </div>
        <aside className="text-[12.5px] flex flex-col gap-4">
          <section><h2 className="text-[14px] font-semibold mb-2">{t('map.legend')}</h2><Legend /></section>
          <section>
            <h2 className="text-[14px] font-semibold mb-2">{t('map.lines')}</h2>
            <table className="tbl">
              <thead><tr><th>{t('dir.line')}</th><th className="num">km</th><th className="num">{t('common.stations')}</th></tr></thead>
              <tbody>{lines.map(l => <tr key={l.id}><td><LineMark id={l.id} withName /></td><td className="num">{km(l.lengthM)}</td><td className="num">{l.stations.length}</td></tr>)}</tbody>
              <tfoot><tr><td>Lines 1 to 4</td><td className="num">{km(m.length)}</td><td className="num">{m.stations}</td></tr></tfoot>
            </table>
          </section>
          <section className="text-muted">
            <p>Coordinate system WGS 84. Alignments routed on OpenStreetMap geometry; preliminary, not surveyed.</p>
            <p className="mt-2">Map data © OpenStreetMap contributors (ODbL). Base map © OpenFreeMap, OpenMapTiles.</p>
            <p className="mt-2">Prepared {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

export function PrintMapPage() {
  return <Sheet />
}
