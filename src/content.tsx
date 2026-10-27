import type { JSX } from 'solid-js'
import { A } from './components/A'

// Meditations, in plain modern wording of the public-domain translations.
export const QUOTES = [
  { lines: ['What stands in the way', 'becomes the way.'], ref: '5.20' },
  { lines: ['Waste no more time arguing what a good man should be.', 'Be one.'], ref: '10.16' },
  { lines: ['Very little is needed', 'to make a happy life.'], ref: '7.67' },
  { lines: ['Dig within.', 'There lies the wellspring of good.'], ref: '7.59' },
  { lines: ['The best revenge', 'is not to become like them.'], ref: '6.6' },
]

export const SITE = 'https://shojib.dev'
export const NAME = 'Shahriar Shojib'
export const EMAIL = 'shojib0@proton.me'
export const PHONE = { label: '+64 22 100 4502', tel: '+64221004502' }

export const SOCIALS = [
  { label: 'github', href: 'https://github.com/shahriar-shojib' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/shahriarshojib' },
  { label: 'cv', href: '/shahriar-shojib-cv.pdf', download: true },
]

export const GREETING = "Kia ora, I'm Shojib."

export const INTRO: (() => JSX.Element)[] = [
  () => (
    <>
      Principal Engineer at <A href="https://tixio.io">Tixio</A>. I lead the engineering team and make the product calls.
    </>
  ),
  () => <>I build AI products, real-time collaboration and the servers they run on.</>,
  () => (
    <>
      Before that, <A href="https://zaynax.health">Zaynax</A>, LVSB and four years
      running servers.
    </>
  ),
  () => (
    <>
      Open source: <A href="https://github.com/tsgonest/tsgonest">TSGONest</A>, a NestJS compiler in Go, plus work on{' '}
      <A href="https://github.com/novuhq/novu/pull/844">Novu</A>,{' '}
      <A href="https://github.com/livekit/node-sdks/pull/112">LiveKit</A> and{' '}
      <A href="https://github.com/udecode/plate/pull/2652">Plate</A>.
    </>
  ),
  () => <>Living in Auckland, open to Senior and Staff roles.</>,
]

export interface App {
  name: string
  ios: string
  android: string
}

/** What the hover card shows: pictures, one plain line, the tools and any store pages. */
export interface Card {
  line: string
  tech: string[]
  shots?: { src: string; alt: string }[]
  /** Phone screenshots sit side by side; anything else is one wide image. */
  phones?: boolean
  apps?: App[]
}

export interface Role {
  years: string
  place: string
  href?: string
  role: string
  text: string
  card?: Card
}

export const WORK: Role[] = [
  {
    years: '2021–now',
    place: 'Tixio & Getonnet',
    href: 'https://tixio.io',
    role: 'Principal Engineer',
    text: 'I lead up to ten engineers across Tixio, Vadio and client work, and own the specs, the architecture and the release. Four AI products in production, 2M+ requests a day at 99.9% uptime.',
    card: {
      line: 'Tixio is one workspace for chat, video meetings, docs, projects, HR and CRM. Vadio runs service businesses on video calls, inspections and AI reports.',
      tech: ['NestJS', 'React', 'React Native', 'MongoDB', 'BullMQ', 'Yjs', 'LiveKit', 'Vercel AI SDK', 'Cloudflare Workers'],
      phones: true,
      shots: [
        { src: '/work/tixio-1.webp', alt: 'Tixio on iPhone: one app for work and conversations' },
        { src: '/work/tixio-2.webp', alt: 'Tixio team chat with channels and threads' },
        { src: '/work/vadio-1.webp', alt: 'Vadio on iPhone: the day’s meetings and customers' },
      ],
      apps: [
        {
          name: 'Tixio',
          ios: 'https://apps.apple.com/us/app/tixio/id6467881017',
          android: 'https://play.google.com/store/apps/details?id=com.tixio.app.tixio_app',
        },
        {
          name: 'Vadio',
          ios: 'https://apps.apple.com/us/app/vadio-connect/id6798805093',
          android: 'https://play.google.com/store/apps/details?id=com.vadio.app',
        },
      ],
    },
  },
  {
    years: '2026',
    place: 'EZCart',
    href: 'https://ezcart.io',
    role: 'Founder',
    text: 'An AI sales agent for social sellers in Bangladesh. It talks to shoppers on Messenger, Instagram and WhatsApp, finds products from a photo and takes the order.',
    card: {
      line: 'Plugs into Shopify and WooCommerce, takes bKash payments and books four couriers. Three pilot merchants so far.',
      tech: ['Vercel AI SDK', 'NestJS', 'Fastify', 'MongoDB Atlas Vector Search', 'Prisma', 'BullMQ', 'React', 'React Native'],
      shots: [{ src: '/work/ezcart.webp', alt: 'The EZCart home page: turn your messages into an online shop' }],
    },
  },
  {
    years: '2025–26',
    place: 'Quicket',
    href: 'https://quicket.me',
    role: 'Consulting Engineer',
    text: 'A new sales layer for football tickets in front of a legacy Django site. 40k requests a second on one server, 4 million visitors, and every ticket gone in five minutes.',
    card: {
      line: 'Tickets for concerts, festivals and football in Bangladesh and Thailand. Seats are held atomically, so two buyers never get the same one.',
      tech: ['Bun', 'Elysia', 'PostgreSQL', 'DragonflyDB', 'BullMQ', 'React', 'nginx', 'Locust'],
      shots: [{ src: '/work/quicket.webp', alt: 'Quicket: event tickets in Bangladesh and Thailand' }],
    },
  },
  {
    years: '2020–21',
    place: 'Zaynax',
    href: 'https://zaynax.health',
    role: 'Team Lead',
    text: 'Led nine engineers across web, backend and native mobile at a multi-vendor e-commerce group, with product search over a million items.',
    card: {
      line: 'My team built Zaynax Health, a health app for Bangladesh: doctor calls, lab tests and medicine orders.',
      tech: ['NestJS', 'Microservices', 'Next.js', 'Typesense', 'MongoDB', 'GCP Cloud Run', 'Jitsi', 'Swift', 'Kotlin'],
      phones: true,
      shots: [
        { src: '/work/zaynax-1.webp', alt: 'Zaynax Health home screen' },
        { src: '/work/zaynax-2.webp', alt: 'Finding a doctor by speciality' },
        { src: '/work/zaynax-3.webp', alt: 'Health packages' },
      ],
      apps: [
        {
          name: 'Zaynax Health',
          ios: 'https://apps.apple.com/us/app/zaynax-health/id1575227928',
          android: 'https://play.google.com/store/apps/details?id=zaynaxhealth.com',
        },
      ],
    },
  },
  {
    years: '2018–20',
    place: 'LVSB',
    role: 'Full Stack Engineer',
    text: 'Modernised legacy sites, with PageSpeed up 50%, and automated live game scores at 100k data points a day.',
    card: {
      line: 'Las Vegas Sports Betting, a US site for sports news, odds and live scores.',
      tech: [],
    },
  },
  {
    years: '2014–18',
    place: 'LVSB, Digital Cusp, Custard',
    role: 'Systems Administrator',
    text: 'Ran servers, web hosting and email for clients in Canada, the US and the UK.',
  },
]

export const OPEN_SOURCE: { name: string; href: string; role: string; text: string; card: Card }[] = [
  {
    name: 'TSGONest',
    href: 'https://github.com/tsgonest/tsgonest',
    role: 'Author',
    text: 'A NestJS compiler in Go. Validation, OpenAPI and typed SDKs straight from your TypeScript types, with 15k+ npm downloads in the past year.',
    card: {
      line: 'Built on typescript-go, the Go port of the TypeScript compiler, so it reads your types at native speed.',
      tech: ['Go', 'typescript-go', 'TypeScript', 'NestJS', 'OpenAPI'],
      shots: [{ src: '/work/tsgonest.webp', alt: 'TSGONest on GitHub' }],
    },
  },
  {
    name: 'Plate',
    href: 'https://github.com/udecode/plate/pull/2652',
    role: 'Contributor',
    text: 'Moved the build from Rollup to tsup across 40+ packages and fixed the broken type declarations.',
    card: {
      line: 'Pull request #2652 on udecode/plate.',
      tech: ['TypeScript', 'tsup', 'Rollup'],
      shots: [{ src: '/work/plate.webp', alt: 'Plate pull request 2652: convert to tsup' }],
    },
  },
  {
    name: 'Novu',
    href: 'https://github.com/novuhq/novu/pull/844',
    role: 'Contributor',
    text: 'The async NestJS module, and the first version of the Rust SDK.',
    card: {
      line: 'Pull request #844 added async options to the NestJS module. The Rust SDK came later, separately.',
      tech: ['TypeScript', 'NestJS', 'Rust'],
      shots: [{ src: '/work/novu.webp', alt: 'Novu pull request 844: NestJS module async provider option' }],
    },
  },
  {
    name: 'LiveKit',
    href: 'https://github.com/livekit/node-sdks/pull/112',
    role: 'Contributor',
    text: 'Fixed how the Node SDK builds token grants.',
    card: {
      line: 'Pull request #112: adding a grant no longer wipes the ones set before it.',
      tech: ['TypeScript', 'Node.js', 'JWT'],
      shots: [{ src: '/work/livekit.webp', alt: 'LiveKit pull request 112: do not overwrite previous grants' }],
    },
  },
]
