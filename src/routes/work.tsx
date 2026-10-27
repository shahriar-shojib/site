import { createFileRoute } from '@tanstack/solid-router'
import { For, type JSX } from 'solid-js'
import { A } from '../components/A'
import { Socials, useReveal } from '../components/bits'
import { OPEN_SOURCE, WORK } from '../content'

export const Route = createFileRoute('/work')({
  head: () => ({ meta: [{ title: 'Work · Shahriar Shojib' }] }),
  component: Work,
})

function Ledger(props: { title: string; children: JSX.Element }) {
  return (
    <section class="mt-12 first:mt-0">
      <h2 data-reveal class="font-display text-[11px] uppercase tracking-[0.14em] opacity-0">
        {props.title}
      </h2>
      <div class="mt-4 border-t border-current/20">{props.children}</div>
    </section>
  )
}

function Row(props: { aside: string; children: JSX.Element }) {
  return (
    <article data-reveal class="grid grid-cols-[7rem_1fr] gap-x-6 border-b border-current/20 py-4 opacity-0 max-sm:grid-cols-1">
      <p class="pt-[3px] text-[11.5px] uppercase tabular-nums tracking-[0.12em] opacity-55">{props.aside}</p>
      <div>{props.children}</div>
    </article>
  )
}

function Work() {
  let root!: HTMLDivElement
  useReveal(() => root)

  return (
    <div class="page-scroll absolute inset-0 [view-transition-name:work]">
      <div ref={root} data-scene-avoid class="max-w-[44rem] px-[6vw] pb-24 pt-44 max-sm:pt-40">
        <Ledger title="Work">
          <For each={WORK}>
            {(w) => (
              <Row aside={w.years}>
                <h3 class="text-[16.5px] font-semibold">
                  <A href={w.href}>{w.place}</A>
                  <span class="font-normal opacity-60"> · {w.role}</span>
                </h3>
                <p class="mt-1 text-[15.5px] leading-[1.55] opacity-85">{w.text}</p>
              </Row>
            )}
          </For>
        </Ledger>
        <Ledger title="Open source">
          <For each={OPEN_SOURCE}>
            {(o) => (
              <Row aside={o.role}>
                <h3 class="text-[16.5px] font-semibold">
                  <A href={o.href}>{o.name}</A>
                </h3>
                <p class="mt-1 text-[15.5px] leading-[1.55] opacity-85">{o.text}</p>
              </Row>
            )}
          </For>
        </Ledger>
        <Socials class="mt-10 text-[14.5px]" />
      </div>
    </div>
  )
}
