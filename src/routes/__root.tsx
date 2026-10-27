import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/solid-router'
import { HydrationScript } from 'solid-js/web'
import { Suspense } from 'solid-js'
import { Site } from '../components/Site'

import styleCss from '../styles.css?url'

// Rough guess for the first paint; the scene corrects it with real sunrise and sunset times.
const NIGHT_GUESS = `(function(){try{var h=Number(new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',hour:'numeric',hour12:false}).format(new Date()));if(h<7||h>=19)document.documentElement.classList.add('night')}catch(e){}})()`

export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Shahriar Shojib' },
      { name: 'description', content: 'Principal engineer in Auckland.' },
    ],
    links: [
      { rel: 'stylesheet', href: styleCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <script innerHTML={NIGHT_GUESS} />
        <HydrationScript />
      </head>
      <body>
        {/* Solid keeps head tags in sync on navigation only when this renders inside the body. */}
        <HeadContent />
        <Site>
          <Suspense>
            <Outlet />
          </Suspense>
        </Site>
        <Scripts />
      </body>
    </html>
  )
}
