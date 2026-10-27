import { Show, createSignal, onCleanup, onMount, type JSX } from 'solid-js'
import { skyProgress } from '../scene/astro'
import { Corner } from './Corner'
import { Masthead } from './Masthead'
import { Scene } from './Scene'

const isNightNow = () => !skyProgress(new Date()).isDay

/** The scene, masthead and day/night corner, shared by every page. */
export function Site(props: { children: JSX.Element }) {
  const [night, setNight] = createSignal(false)
  const [ready, setReady] = createSignal(false)
  let overridden = false

  const apply = (value: boolean) => {
    setNight(value)
    document.documentElement.classList.toggle('night', value)
  }

  onMount(() => {
    apply(isNightNow())
    setReady(true)
    // Follow the real sky until the visitor picks a side.
    const follow = setInterval(() => !overridden && apply(isNightNow()), 60_000)
    onCleanup(() => clearInterval(follow))
  })

  const toggle = () => {
    overridden = true
    apply(!night())
  }

  return (
    <div class="relative h-dvh w-full overflow-hidden">
      <Show when={ready()}>
        <Scene night={night()} />
      </Show>
      <Corner night={night()} onToggle={toggle} />
      <Masthead />
      <main class="relative h-full">{props.children}</main>
    </div>
  )
}
