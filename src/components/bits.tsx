import { For, createSignal, onMount } from 'solid-js'
import { animate, stagger } from 'motion'
import { QUOTES, SOCIALS } from '../content'
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

/** A random Meditations quote, picked after hydration so the server and the client agree. */
export function useQuote() {
  const [quote, setQuote] = createSignal(QUOTES[0])
  onMount(() => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]))
  return quote
}

export function QuoteLines(props: { lines: string[] }) {
  return <For each={props.lines}>{(line, i) => <>{i() > 0 && <br />}{line}</>}</For>
}

export function Socials(props: { class?: string }) {
  return (
    <p data-reveal class={`opacity-0 ${props.class ?? ''}`}>
      <For each={SOCIALS}>
        {(s, i) => (
          <>
            {i() > 0 && <span class="opacity-40"> / </span>}
            <A href={s.href} class="link opacity-70 hover:opacity-100">
              {s.label}
            </A>
          </>
        )}
      </For>
    </p>
  )
}
