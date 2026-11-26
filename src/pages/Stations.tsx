import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, MapPinned } from 'lucide-react'
import { stations, type Station } from '../data/network'
import { useLang } from '../i18n'
import { ReportPage } from '../components/Layout'
import { LineMark, Button, download } from '../components/ui'
import { StationPanel } from '../components/StationPanel'
import { href, navigate } from '../router'
import { stationsCsv } from '../lib/exports'

type SortKey = 'code' | 'name' | 'line' | 'type' | 'district'

export function StationsPage() {
  const { t, name, lang } = useLang()
  const [q, setQ] = useState('')
  const [lineFilter, setLineFilter] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'code', dir: 1 })
  const [open, setOpen] = useState<string | null>(null)

  const typeOf = (s: Station) => [...new Set(s.types)].map(x => t(`type.${x}` as never)).join(', ')
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = stations.filter(s =>
      (!lineFilter || s.lines.includes(lineFilter)) &&
      (!needle || s.en.toLowerCase().includes(needle) || s.km.includes(q.trim()) || s.codes.some(c => c.includes(needle)) || (s.district?.en.toLowerCase().includes(needle) ?? false)))
    const val = (s: Station): string => ({
      code: s.codes[0], name: name(s), line: s.lines.join(','), type: s.types.join(','), district: s.district ? name(s.district) : 'zzz',
    })[sort.key]
    return list.sort((a, b) => val(a).localeCompare(val(b), lang === 'km' ? 'km' : 'en', { numeric: true }) * sort.dir)
  }, [q, lineFilter, sort, name, lang])

  const header = (key: SortKey, label: string, cls = '') => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={cls}>
      <button type="button" onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))} className="inline-flex items-center gap-1 font-semibold">
        {label}<span aria-hidden="true" className="text-muted text-[11px] w-2">{sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  )

  return (
    <ReportPage title={t('nav.stations')} lead={`${stations.length} proposed stations. Positions are desk-study coordinates on the routed alignments and have not been verified on site.`}>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-full sm:w-[320px]">
          <label htmlFor="st-filter" className="block text-[12.5px] text-muted mb-1">{t('dir.search')}</label>
          <input id="st-filter" type="search" value={q} onChange={e => setQ(e.target.value)} className="w-full h-10 px-3 border border-line-strong rounded-sm" />
        </div>
        <div>
          <label htmlFor="st-line" className="block text-[12.5px] text-muted mb-1">{t('dir.line')}</label>
          <select id="st-line" value={lineFilter} onChange={e => setLineFilter(e.target.value)} className="h-10 px-2 border border-line-strong rounded-sm bg-white min-w-[200px]">
            <option value="">{t('map.allLines')}</option>
            {['L1', 'L2', 'L3', 'L4', 'L5'].map(id => <option key={id} value={id}>{id.replace('L', 'Line ')}</option>)}
          </select>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <Button onClick={() => download('phnom-penh-rail-2050-stations.csv', stationsCsv(), 'text/csv;charset=utf-8')}>{t('common.download')} CSV</Button>
        </div>
      </div>
      <p className="text-[13px] text-muted mb-2" aria-live="polite">{rows.length} {t('dir.count')}</p>

      <div className="overflow-x-auto border border-line">
        <table className="tbl min-w-[880px]">
          <thead>
            <tr>
              <th className="w-10"><span className="sr-only">Details</span></th>
              {header('code', t('dir.code'), 'w-[110px]')}
              {header('name', t('dir.name'))}
              {header('line', t('dir.line'), 'w-[110px]')}
              {header('type', t('dir.type'), 'w-[160px]')}
              {header('district', t('dir.district'), 'w-[170px]')}
              <th className="w-[176px]"><span className="sr-only">{t('st.showOnMap')}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <Fragment key={s.id}>
                <tr className={open === s.id ? 'bg-navy-50' : ''}>
                  <td>
                    <button type="button" aria-expanded={open === s.id} aria-label={`${s.en} details`} onClick={() => setOpen(o => (o === s.id ? null : s.id))} className="h-7 w-7 grid place-items-center border border-line rounded-sm">
                      {open === s.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                  </td>
                  <td className="font-mono">{s.codes.join(' / ')}</td>
                  <td>
                    <button type="button" className="text-left hover:underline" onClick={() => navigate(href('map', { station: s.id }))}>
                      <span className="block font-medium">{s.en}</span>
                      <span className="block font-khmer text-[13.5px]" lang="km">{s.km}</span>
                    </button>
                    {s.flags.platformOnCurve.length > 0 && <span className="block text-warn text-[12px]">Platform on a curve, to be resolved in design</span>}
                  </td>
                  <td><span className="flex gap-1 flex-wrap">{s.lines.map(l => <LineMark key={l} id={l} />)}</span></td>
                  <td>{typeOf(s)}{s.interchange && <span className="block text-muted text-[12.5px]">{t('st.interchange')}</span>}</td>
                  <td>{s.district ? name(s.district) : <span className="text-muted">Kandal Province</span>}</td>
                  <td>
                    <Button onClick={() => navigate(href('map', { station: s.id }))} className="h-8 whitespace-nowrap"><MapPinned size={14} aria-hidden="true" />{t('st.showOnMap')}</Button>
                  </td>
                </tr>
                {open === s.id && (
                  <tr>
                    <td colSpan={7} className="bg-white">
                      <div className="max-w-[760px] py-2"><StationPanel s={s} /></div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </ReportPage>
  )
}
