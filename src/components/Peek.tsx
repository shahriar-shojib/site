import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { animate } from 'motion'
import type { Card } from '../content'

// Below this width, or without a mouse, there's no room beside the list, so a tap opens the card under the row.
const SIDE_CARD = '(hover: hover) and (min-width: 1240px)'
const CLOSE_DELAY_MS = 160
const GAP_PX = 48

const QUIET_LINK = 'link opacity-70 hover:opacity-100'

function external(href: string) {
  return { href, target: '_blank', rel: 'noopener noreferrer' }
}

function appear(el: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  animate(el, { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0)'] }, { duration: 0.22, ease: [0.22, 1, 0.36, 1] })
}

function Shots(props: { card: Card }) {
  return (
    <Show when={props.card.shots?.length}>
      <div class={props.card.phones ? 'grid grid-cols-3 gap-2' : ''}>
        <For each={props.card.shots}>
          {(shot) => (
            <img
              src={shot.src}
              alt={shot.alt}
              decoding="async"
              class={
                props.card.phones
                  ? 'h-52 w-full rounded-[7px] object-cover object-top'
                  : 'aspect-[2/1] w-full rounded-[3px] object-cover object-top'
              }
            />
          )}
        </For>
      </div>
    </Show>
  )
}

/** The pictures, the line, the tools and the store pages for one entry. */
export function PeekCard(props: { card: Card; href?: string; inline?: boolean }) {
  const host = () => props.href && new URL(props.href).host.replace(/^www\./, '')
  return (
    <div class="flex flex-col gap-3">
      <Shots card={props.card} />
      <p class="text-[14.5px] leading-[1.5] opacity-85">{props.card.line}</p>
      <Show when={props.card.tech.length}>
        <p class="text-[11px] uppercase leading-[1.7] tracking-[0.12em] opacity-60">{props.card.tech.join(' · ')}</p>
      </Show>
      <For each={props.card.apps}>
        {(app) => (
          <p class="text-[13.5px]">
            <span class="opacity-60">{app.name}: </span>
            <a class={QUIET_LINK} {...external(app.ios)}>
              App Store
            </a>
            <span class="opacity-40"> / </span>
            <a class={QUIET_LINK} {...external(app.android)}>
              Google Play
            </a>
          </p>
        )}
      </For>
      <Show when={props.inline && props.href}>
        <a class={`${QUIET_LINK} text-[13.5px]`} {...external(props.href!)}>
          Visit {host()} ↗
        </a>
      </Show>
    </div>
  )
}

interface Entry {
  label: string
  href?: string
  suffix?: string
  text: string
  card?: Card
}

/**
 * One row of the work page whose name opens its card: beside the list on a wide screen with a mouse, under the row
 * everywhere else. The side card clears the scene around itself like the page text does.
 */
export function Peek(props: Entry) {
  let trigger!: HTMLElement
  let closing: ReturnType<typeof setTimeout> | undefined
  const [side, setSide] = createSignal(false)
  const [open, setOpen] = createSignal(false)
  const [spot, setSpot] = createSignal({ left: 0, top: 0 })

  onMount(() => {
    const query = matchMedia(SIDE_CARD)
    const sync = () => {
      setSide(query.matches)
      setOpen(false)
    }
    sync()
    query.addEventListener('change', sync)
    const shut = () => side() && setOpen(false)
    window.addEventListener('scroll', shut, { capture: true, passive: true })
    onCleanup(() => {
      query.removeEventListener('change', sync)
      window.removeEventListener('scroll', shut, { capture: true })
      clearTimeout(closing)
    })
  })

  const show = () => {
    if (!props.card || !side()) return
    clearTimeout(closing)
    const row = trigger.closest('article')!.getBoundingClientRect()
    setSpot({ left: row.right + GAP_PX, top: Math.max(96, row.top - 12) })
    setOpen(true)
  }
  const hide = () => {
    if (!side()) return
    clearTimeout(closing)
    closing = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }
  // Lower rows would push the card off the screen, so it rises until it fits.
  const settle = (el: HTMLElement) => {
    appear(el)
    requestAnimationFrame(() => setSpot((s) => ({ ...s, top: Math.max(96, Math.min(s.top, innerHeight - el.offsetHeight - 24)) })))
  }
  const toggle = (e: MouseEvent) => {
    if (!props.card || side()) return
    e.preventDefault()
    setOpen(!open())
  }

  const hover = { onPointerEnter: show, onPointerLeave: hide, onFocus: show, onBlur: hide, onClick: toggle }
  const expanded = () => (props.card && !side() ? open() : undefined)

  return (
    <>
      <h3 class="text-[16.5px] font-semibold">
        <Show
          when={props.href}
          fallback={
            <Show when={props.card} fallback={props.label}>
              <button ref={(el) => (trigger = el)} type="button" class="link font-semibold" aria-expanded={expanded()} {...hover}>
                {props.label}
              </button>
            </Show>
          }
        >
          <a ref={(el) => (trigger = el)} class="link" aria-expanded={expanded()} {...external(props.href!)} {...hover}>
            {props.label}
          </a>
        </Show>
        <Show when={props.suffix}>
          <span class="font-normal opacity-60"> · {props.suffix}</span>
        </Show>
      </h3>
      <p class="mt-1 text-[15.5px] leading-[1.55] opacity-85">{props.text}</p>
      <Show when={open() && !side() && props.card}>
        <div ref={appear} class="mt-4 max-w-[26rem]">
          <PeekCard card={props.card!} href={props.href} inline />
        </div>
      </Show>
      <Show when={open() && side() && props.card}>
        <Portal>
          <div
            ref={settle}
            data-scene-avoid
            role="tooltip"
            class="fixed z-20 w-[22rem] max-h-[calc(100dvh-7rem)] overflow-hidden rounded-[4px] border border-current/15 bg-[var(--bg)] p-3 text-[var(--fg)]"
            style={{ left: `${spot().left}px`, top: `${spot().top}px` }}
            onPointerEnter={show}
            onPointerLeave={hide}
          >
            <PeekCard card={props.card!} href={props.href} />
          </div>
        </Portal>
      </Show>
    </>
  )
}
