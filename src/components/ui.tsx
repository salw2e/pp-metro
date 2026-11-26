import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { lineById } from '../data/network'
import { useLang } from '../i18n'

export function LineMark({ id, withName = false }: { id: string; withName?: boolean }) {
  const { name } = useLang()
  const l = lineById.get(id)!
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span
        className="inline-grid place-items-center w-5 h-5 text-[11px] font-semibold text-white font-mono rounded-sm shrink-0"
        style={{ background: l.color }}
        aria-hidden={withName}
      >
        {l.code}
      </span>
      {withName && <span>{name(l)}</span>}
      {!withName && <span className="sr-only">{name(l)}</span>}
    </span>
  )
}

export function Button({ children, variant = 'default', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' }) {
  const v = variant === 'primary'
    ? 'bg-navy-900 text-white border-navy-900 hover:bg-navy-800'
    : variant === 'ghost'
      ? 'bg-transparent border-transparent hover:bg-panel'
      : 'bg-white border-line-strong hover:bg-panel'
  return (
    <button type="button" className={`inline-flex items-center justify-center gap-2 h-9 px-3 text-[13px] font-medium border rounded-sm disabled:opacity-50 ${v} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function KV({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[132px_minmax(0,1fr)] gap-3 py-2 border-b border-line text-[13.5px]">
      <dt className="text-muted">{k}</dt>
      <dd className="m-0 min-w-0">{children}</dd>
    </div>
  )
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="text-[18px] font-semibold text-navy-900 mt-10 mb-3 scroll-mt-24">{children}</h2>
}

export function Note({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' }) {
  return (
    <div className={`border px-4 py-3 text-[13.5px] ${tone === 'warn' ? 'border-[#ecd9ae] bg-warn-bg text-warn' : 'border-line bg-panel'}`}>
      {children}
    </div>
  )
}

export function Stat({ value, label, sub }: { value: ReactNode; label: string; sub?: string }) {
  return (
    <div className="border border-line px-4 py-3 bg-white">
      <div className="text-[22px] font-semibold text-navy-900 leading-tight font-mono">{value}</div>
      <div className="text-[13px] mt-1">{label}</div>
      {sub && <div className="text-[12px] text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
