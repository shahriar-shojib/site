import { For, onMount } from 'solid-js'
import { animate, stagger } from 'motion'
import { EMAIL, PHONE, SOCIALS } from '../content'
import { A } from './A'

/** Fades in every [data-reveal] element under the root, one after another, as the old page finishes fading out. */
export function useReveal(root: () => HTMLElement) {
  onMount(() => {
    const items = root().querySelectorAll('[data-reveal]')
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return animate(items, { opacity: 1 }, { duration: 0 })
    animate(
      items,
      { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0)'] },
      { duration: 0.7, delay: stagger(0.05, { startDelay: 0.16 }), ease: [0.22, 1, 0.36, 1] },
    )
  })
}

export function QuoteLines(props: { lines: string[] }) {
  return <For each={props.lines}>{(line, i) => <>{i() > 0 && <br />}{line}</>}</For>
}

const QUIET_LINK = 'link opacity-70 hover:opacity-100'

export function Socials(props: { class?: string }) {
  return (
    <div data-reveal class={`flex flex-col gap-1 opacity-0 ${props.class ?? ''}`}>
      <p>
        <For each={SOCIALS}>
          {(s, i) => (
            <>
              {i() > 0 && <span class="opacity-40"> / </span>}
              <A href={s.href} class={QUIET_LINK}>
                {s.label}
              </A>
            </>
          )}
        </For>
      </p>
      <p>
        <a class={QUIET_LINK} href={`mailto:${EMAIL}`}>
          {EMAIL}
        </a>
        <span class="opacity-40"> · </span>
        <a class={`${QUIET_LINK} tabular-nums`} href={`tel:${PHONE.tel}`}>
          {PHONE.label}
        </a>
      </p>
    </div>
  )
}
