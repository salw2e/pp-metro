import { ArrowLeft } from 'lucide-react'
import { lineById, type Station } from '../data/network'
import { accessibility, construction, verification, KIND_KM } from '../data/stationInfo'
import { useLang } from '../i18n'
import { KV, LineMark } from './ui'

export function StationPanel({ s, onBack }: { s: Station; onBack?: () => void }) {
  const { t, name, lang, num } = useLang()
  const v = verification(s)
  const kind = (k: string) => (lang === 'km' ? KIND_KM[k] ?? k : k)
  const types = [...new Set(s.types)].map(x => t(`type.${x}` as never)).join(', ')
  return (
    <article aria-labelledby={`st-${s.id}`} className="text-[13.5px]">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[13px] text-accent mb-3">
          <ArrowLeft size={14} aria-hidden="true" /> {t('map.lines')}
        </button>
      )}
      <header className="mb-3">
        <h2 id={`st-${s.id}`} className="text-[18px] font-semibold text-navy-900 leading-snug">{s.en}</h2>
        <p className="text-[16px] leading-snug font-khmer" lang="km">{s.km}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {s.lines.map((l, i) => (
            <span key={l} className="inline-flex items-center gap-1.5 border border-line px-2 h-7 rounded-sm">
              <LineMark id={l} />
              <span className="font-mono text-[12.5px]">{s.codes[i]}</span>
            </span>
          ))}
        </div>
      </header>
      <dl className="m-0">
        <KV k={t('st.code')}><span className="font-mono">{s.codes.join(' / ')}</span></KV>
        <KV k={t('st.coords')}><span className="font-mono">{s.lat.toFixed(5)}° N, {s.lng.toFixed(5)}° E</span></KV>
        <KV k={t('st.lines')}>{s.lines.map(l => <div key={l}><LineMark id={l} withName /></div>)}</KV>
        <KV k={t('st.type')}>{types}{s.flags.platformOnCurve.length > 0 && <span className="block text-warn text-[12.5px]">Platform on a curve in this preliminary alignment</span>}</KV>
        <KV k={t('st.interchange')}>
          {s.interchange
            ? s.lines.map(l => name(lineById.get(l)!)).join(', ')
            : s.id === 'centralmarket' || s.id === 'ppstation'
              ? 'Walking link of about 450 m between Central Market metro and Phnom Penh railway station'
              : '—'}
        </KV>
        <KV k={t('st.district')}>
          {s.district ? (
            <>
              {name(s.district)}
              {s.district.pop2019 && <span className="block text-muted text-[12.5px]">{num(s.district.pop2019)} residents (2019 census, whole khan)</span>}
            </>
          ) : 'Outside the Phnom Penh khan boundaries (Kandal Province)'}
        </KV>
        <KV k={t('st.catchment')}>
          {s.neighbourhoods.length ? s.neighbourhoods.join(', ') : '—'}
          <span className="block text-muted text-[12.5px]">Residential and commercial catchment within about 800 m to be measured from land-use and population data.</span>
        </KV>
        <KV k={t('st.landmarks')}>
          {s.landmarks.length ? (
            <ul className="m-0 p-0 list-none">
              {s.landmarks.map(l => (
                <li key={l.osm} className="flex justify-between gap-3">
                  <span className="min-w-0">{lang === 'km' && l.km ? l.km : l.en} <span className="text-muted">({kind(l.kind)})</span></span>
                  <span className="font-mono text-muted shrink-0">{l.distanceM} m</span>
                </li>
              ))}
            </ul>
          ) : t('st.none')}
        </KV>
        <KV k={t('st.transport')}>
          {s.transport.length ? (
            <ul className="m-0 p-0 list-none">
              {s.transport.map(l => (
                <li key={l.osm} className="flex justify-between gap-3">
                  <span className="min-w-0">{l.en} <span className="text-muted">({kind(l.kind)})</span></span>
                  <span className="font-mono text-muted shrink-0">{l.distanceM} m</span>
                </li>
              ))}
            </ul>
          ) : t('st.none')}
          <span className="block text-muted text-[12.5px]">City Bus routes are not in the OpenStreetMap extract and must be confirmed with the operator.</span>
        </KV>
        <KV k={t('st.access')}>
          <ul className="m-0 pl-4 list-disc">{accessibility(s).map(x => <li key={x}>{x}</li>)}</ul>
        </KV>
        <KV k={t('st.construction')}>
          <ul className="m-0 pl-4 list-disc">{construction(s).map(x => <li key={x}>{x}</li>)}</ul>
        </KV>
        <KV k={t('st.why')}>{s.why}</KV>
        <KV k={t('st.verification')}>
          <span className="font-medium">{v.label}</span>
          <span className="block text-muted text-[12.5px]">{v.detail}</span>
        </KV>
      </dl>
    </article>
  )
}
