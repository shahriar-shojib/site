import { Link } from '@tanstack/solid-router'
import type { JSX } from 'solid-js'

const SMALL_CAPS = 'text-[11.5px] uppercase tracking-[0.2em]'

function NavLink(props: { to: '/' | '/work'; class?: string; children: JSX.Element }) {
  return (
    <Link to={props.to} class={props.class} activeOptions={{ exact: true }}>
      {props.children}
    </Link>
  )
}

/** The letterhead: name, title and the page links, held still while pages change beneath it. */
export function Masthead() {
  return (
    <header data-scene-avoid class="absolute left-[6vw] top-8 z-10">
      <NavLink to="/" class="font-display block text-[20px] uppercase leading-none tracking-[0.02em] max-sm:text-[16px]">
        Shahriar Shojib
      </NavLink>
      <p class={`mt-2.5 opacity-55 ${SMALL_CAPS}`}>Principal Engineer · Auckland</p>
      <nav class={`nav mt-5 flex gap-5 ${SMALL_CAPS}`}>
        <NavLink to="/">Index</NavLink>
        <NavLink to="/work">Work</NavLink>
      </nav>
    </header>
  )
}
