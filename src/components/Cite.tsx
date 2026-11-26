import { refById } from '../data/references'
import { href } from '../router'

/** Inline citation linking to the reference list, with the source title in the tooltip. */
export function Cite({ ids }: { ids: string[] }) {
  return (
    <span className="whitespace-nowrap text-[0.85em] align-baseline">
      [
      {ids.map((id, i) => {
        const r = refById.get(id)
        return (
          <span key={id}>
            {i > 0 && ', '}
            <a href={`${href('references')}#${id}`} title={r ? `${r.publisher}, ${r.date}: ${r.title}` : id} className="text-accent underline underline-offset-2">{id}</a>
          </span>
        )
      })}
      ]
    </span>
  )
}
