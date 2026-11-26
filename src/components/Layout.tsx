import { useEffect, useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { useLang, type Lang } from '../i18n'
import { Link, PAGES, href, type Page } from '../router'

function LangSwitch() {
  const { lang, setLang, t } = useLang()
  const opt = (l: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      className={`h-8 px-3 text-[13px] font-medium ${lang === l ? 'bg-white text-navy-900' : 'text-white/85 hover:text-white'}`}
      lang={l}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label={t('language')} className="flex shrink-0 border border-white/40 rounded-sm overflow-hidden">
      {opt('en', 'EN')}
      {opt('km', 'ខ្មែរ')}
    </div>
  )
}

function Mark() {
  // plain line-network mark; deliberately not a seal or emblem
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      <rect x="0.5" y="0.5" width="27" height="27" fill="none" stroke="currentColor" strokeOpacity="0.5" />
      <path d="M6 22 L14 14 L22 6" stroke="#ffffff" strokeWidth="2.5" fill="none" />
      <path d="M6 14 H22" stroke="#9fb6d8" strokeWidth="2.5" fill="none" />
      <circle cx="14" cy="14" r="3" fill="#12284a" stroke="#ffffff" strokeWidth="2" />
    </svg>
  )
}

export function Layout({ page, children, full = false }: { page: Page; children: ReactNode; full?: boolean }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [page])
  useEffect(() => {
    document.title = `${t(`nav.${page}` as never) || t('title')} | ${t('title')}`
  }, [page, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={full ? 'h-dvh flex flex-col overflow-hidden' : 'min-h-dvh flex flex-col'}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">Skip to content</a>
      <header className="bg-navy-900 text-white no-print shrink-0">
        <div className="mx-auto max-w-[1440px] h-14 px-4 lg:px-6 flex items-center gap-3">
          <Link to={href('summary')} className="flex items-center gap-3 min-w-0">
            <Mark />
            <span className="min-w-0">
              <span className="block text-[14px] sm:text-[15px] font-semibold leading-tight truncate">{t('title')}</span>
              <span className="block text-[12px] leading-tight text-white/70 truncate">{t('subtitle')}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LangSwitch />
            <button
              type="button"
              className="lg:hidden h-8 w-8 grid place-items-center border border-white/40 rounded-sm"
              aria-label={t('menu')}
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
        <nav aria-label="Main" className="hidden lg:block bg-navy-950">
          <ul className="mx-auto max-w-[1440px] px-6 flex overflow-x-auto">
            {PAGES.map(p => (
              <li key={p} className="shrink-0">
                <Link
                  to={href(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`block h-10 leading-10 px-3 text-[13px] whitespace-nowrap border-b-2 ${p === page ? 'border-white text-white font-medium' : 'border-transparent text-white/75 hover:text-white'}`}
                >
                  {t(`nav.${p}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className="bg-warn-bg border-b border-[#ecd9ae] text-warn no-print shrink-0">
        <p className="mx-auto max-w-[1440px] px-4 lg:px-6 py-1.5 text-[12.5px] leading-snug">{t('status')}</p>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 lg:hidden" onClick={() => setOpen(false)}>
          <nav
            aria-label="Main"
            className="absolute right-0 top-0 h-full w-[min(320px,86vw)] bg-white shadow-xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-line">
              <span className="font-semibold">{t('menu')}</span>
              <button type="button" className="h-8 w-8 grid place-items-center border border-line rounded-sm" aria-label={t('close')} onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <ul className="overflow-y-auto py-2">
              {PAGES.map(p => (
                <li key={p}>
                  <Link
                    to={href(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`block px-4 py-3 text-[15px] border-l-2 ${p === page ? 'border-navy-900 bg-navy-50 font-medium' : 'border-transparent'}`}
                  >
                    {t(`nav.${p}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <main id="main" className={full ? 'flex-1 min-h-0 relative' : 'flex-1'}>{children}</main>

      {!full && (
        <footer className="border-t border-line bg-panel no-print">
          <div className="mx-auto max-w-[1440px] px-4 lg:px-6 py-6 text-[13px] text-muted grid gap-2 md:grid-cols-2">
            <p>{t('status')}</p>
            <p className="md:text-right">
              Map data © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL). Base maps: OpenFreeMap, OpenMapTiles, Esri.
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}

/** Standard report page frame: title block plus content, used by every page except the map. */
export function ReportPage({ title, lead, children, aside }: { title: string; lead?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  const { t, lang } = useLang()
  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-6 py-8">
      <div className="border-b border-line pb-4 mb-6">
        <h1 className="text-[24px] leading-tight font-semibold text-navy-900">{title}</h1>
        {lead && <div className="mt-2 text-muted max-w-[80ch]">{lead}</div>}
      </div>
      {lang === 'km' && <p className="mb-6 border border-line bg-panel px-4 py-3 text-[14px]">{t('common.englishOnly')}</p>}
      {aside ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">{children}</div>
          <aside className="min-w-0">{aside}</aside>
        </div>
      ) : children}
    </div>
  )
}
