import { useLang } from '../i18n'
import { Link, href } from '../router'

export function NotFound() {
  const { t } = useLang()
  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-6 py-16">
      <h1 className="text-[24px] font-semibold text-navy-900">Page not found</h1>
      <p className="mt-2 text-muted">The address does not match a page of this proposal.</p>
      <p className="mt-4"><Link to={href('summary')} className="text-accent underline">{t('nav.summary')}</Link></p>
    </div>
  )
}
