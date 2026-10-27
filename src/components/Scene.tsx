import { createEffect, onCleanup, onMount } from 'solid-js'
import { SceneEngine } from '../scene/engine'

export function Scene(props: { night: boolean }) {
  let canvas!: HTMLCanvasElement
  let engine: SceneEngine | undefined

  onMount(() => {
    engine = new SceneEngine(canvas, props.night)
    onCleanup(() => engine?.destroy())
  })

  createEffect(() => engine?.setNight(props.night))

  return <canvas ref={canvas} aria-hidden="true" class="absolute inset-0 h-full w-full" />
}
