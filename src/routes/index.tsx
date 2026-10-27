import { createFileRoute } from '@tanstack/solid-router'
import { For } from 'solid-js'
import { QuoteLines, Socials, useReveal } from '../components/bits'
import { GREETING, INTRO, QUOTE } from '../content'
import { seo } from '../seo'

export const Route = createFileRoute('/')({
  head: () =>
    seo({
      path: '/',
      title: 'Shahriar Shojib · Principal Engineer in Auckland',
      description:
        'Principal Engineer in Auckland. I build AI products, real-time collaboration and the servers they run on. Open to Senior and Staff roles.',
    }),
  component: Home,
})

function Home() {
  let root!: HTMLDivElement
  useReveal(() => root)

  // On a phone the scene gets the first screen and the greeting peeks up from below it.
  return (
    <section class="absolute bottom-0 left-0 max-w-[43rem] px-[6vw] pb-[11vh] [view-transition-name:home] max-sm:page-scroll max-sm:inset-0 max-sm:max-w-none max-sm:pb-10 max-sm:pt-[calc(100svh-6.5rem)]">
      <div ref={root} data-scene-avoid class="flex flex-col gap-[0.4em] text-[17.5px] leading-[1.5] max-sm:text-[15.5px]">
        <h1 data-reveal class="font-semibold opacity-0">
          {GREETING}
        </h1>
        <For each={INTRO}>
          {(Line) => (
            <p data-reveal class="opacity-0">
              <Line />
            </p>
          )}
        </For>
        <Socials class="mt-3 text-[14.5px]" />
        <blockquote data-reveal class="mt-9 opacity-0 max-sm:mt-6">
          <p class="text-[16px] font-[350] leading-snug [font-style:oblique_10deg] max-sm:text-[15px]">
            <QuoteLines lines={QUOTE.lines} />
          </p>
          <p class="mt-3 text-[10.5px] uppercase tracking-[0.2em] opacity-50">{QUOTE.by}</p>
        </blockquote>
      </div>
    </section>
  )
}
