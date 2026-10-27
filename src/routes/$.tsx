import { Link, createFileRoute } from '@tanstack/solid-router'
import { useReveal } from '../components/bits'

// Every unknown path lands here, and the build saves it as 404.html for the host to serve.
export const Route = createFileRoute('/$')({
  head: () => ({
    meta: [{ title: 'Not found · Shahriar Shojib' }, { name: 'robots', content: 'noindex' }],
  }),
  component: NotFound,
})

function NotFound() {
  let root!: HTMLDivElement
  useReveal(() => root)
  return (
    <section class="absolute bottom-0 left-0 max-w-[43rem] px-[6vw] pb-[11vh] [view-transition-name:lost] max-sm:pb-10">
      <div ref={root} data-scene-avoid class="flex flex-col gap-[0.4em] text-[17.5px] leading-[1.5] max-sm:text-[15.5px]">
        <h1 data-reveal class="font-semibold opacity-0">
          Nothing lives here.
        </h1>
        <p data-reveal class="opacity-0">
          Head back to the{' '}
          <Link class="link" to="/">
            index
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
