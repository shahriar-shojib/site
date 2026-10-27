import { Show, type JSX } from 'solid-js'

/** Opens other sites in a new tab; without an href the children render as plain text. */
export function A(props: { href?: string; class?: string; download?: boolean; children: JSX.Element }) {
  const external = () => props.href?.startsWith('http')
  return (
    <Show when={props.href} fallback={props.children}>
      <a
        class={props.class ?? 'link'}
        href={props.href}
        download={props.download ? '' : undefined}
        target={external() ? '_blank' : undefined}
        rel={external() ? 'noopener noreferrer' : undefined}
      >
        {props.children}
      </a>
    </Show>
  )
}
