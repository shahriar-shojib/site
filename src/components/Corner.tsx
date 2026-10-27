import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import { animate } from 'motion'
import { formatAucklandTime, skyProgress } from '../scene/astro'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.6">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.6">
      <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" />
    </svg>
  )
}

export function Corner(props: { night: boolean; onToggle: () => void }) {
  let icon!: HTMLSpanElement
  const [now, setNow] = createSignal<Date | null>(null)

  onMount(() => {
    setNow(new Date())
    const tick = setInterval(() => setNow(new Date()), 20_000)
    onCleanup(() => clearInterval(tick))
  })

  const toggle = () => {
    animate(icon, { rotate: [0, props.night ? -90 : 90], opacity: [1, 0] }, { duration: 0.18 }).then(() => {
      props.onToggle()
      animate(icon, { rotate: [props.night ? 90 : -90, 0], opacity: [0, 1] }, { duration: 0.32, ease: [0.22, 1, 0.36, 1] })
    })
  }

  const next = () => {
    const n = now()
    if (!n) return ''
    const sky = skyProgress(n)
    return sky.isDay ? `Sunset ${formatAucklandTime(sky.sunset)}` : `Sunrise ${formatAucklandTime(sky.sunrise)}`
  }

  return (
    <div data-scene-avoid class="absolute right-[6vw] top-8 z-10 flex items-start gap-5 text-[12px] leading-relaxed">
      <Show when={now()}>
        {(n) => (
          <div class="text-right tabular-nums max-sm:hidden">
            <div class="opacity-75">Auckland {formatAucklandTime(n())}</div>
            <div class="opacity-50">{next()}</div>
          </div>
        )}
      </Show>
      <button
        type="button"
        onClick={toggle}
        aria-label={props.night ? 'Switch to day' : 'Switch to night'}
        class="-m-1.5 cursor-pointer rounded-full p-1.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-current"
      >
        <span ref={icon} class="block">
          <Show when={props.night} fallback={<MoonIcon />}>
            <SunIcon />
          </Show>
        </span>
      </button>
    </div>
  )
}
