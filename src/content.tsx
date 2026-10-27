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

export const SOCIALS = [
  { label: 'github', href: 'https://github.com/shahriar-shojib' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/shahriarshojib' },
  { label: 'email', href: 'mailto:shojib0@proton.me' },
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
      Before that, <A href="https://zaynaxgroup.com">Zaynax</A>, <A href="https://lvsb.com">LVSB</A> and four years
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

export interface Role {
  years: string
  place: string
  href?: string
  role: string
  text: string
}

export const WORK: Role[] = [
  {
    years: '2021–now',
    place: 'Tixio & Getonnet',
    href: 'https://tixio.io',
    role: 'Principal Engineer',
    text: 'I lead up to ten engineers across Tixio, Vadio and client work, and own the specs, the architecture and the release. Four AI products in production, 2M+ requests a day at 99.9% uptime.',
  },
  {
    years: '2026',
    place: 'EZCart',
    href: 'https://ezcart.io',
    role: 'Founder',
    text: 'An AI sales agent for social sellers in Bangladesh. It talks to shoppers on Messenger, Instagram and WhatsApp, finds products from a photo and takes the order.',
  },
  {
    years: '2025–26',
    place: 'Quicket',
    href: 'https://quicket.me',
    role: 'Consulting Engineer',
    text: 'A new sales layer for football tickets in front of a legacy Django site. 40k requests a second on one server, 4 million visitors, and every ticket gone in five minutes.',
  },
  {
    years: '2020–21',
    place: 'Zaynax',
    href: 'https://zaynaxgroup.com',
    role: 'Team Lead',
    text: 'Led nine engineers across web, backend and native mobile at a multi-vendor e-commerce group, with product search over a million items.',
  },
  {
    years: '2018–20',
    place: 'LVSB',
    href: 'https://lvsb.com',
    role: 'Full Stack Engineer',
    text: 'Modernised legacy sites, with PageSpeed up 50%, and automated live game scores at 100k data points a day.',
  },
  {
    years: '2014–18',
    place: 'LVSB, Digital Cusp, Custard',
    role: 'Systems Administrator',
    text: 'Ran servers, web hosting and email for clients in Canada, the US and the UK.',
  },
]

export const OPEN_SOURCE = [
  {
    name: 'TSGONest',
    href: 'https://github.com/tsgonest/tsgonest',
    role: 'Author',
    text: 'A NestJS compiler in Go. Validation, OpenAPI and typed SDKs straight from your TypeScript types, with 15k+ npm downloads in the past year.',
  },
  {
    name: 'Plate',
    href: 'https://github.com/udecode/plate/pull/2652',
    role: 'Contributor',
    text: 'Moved the build from Rollup to tsup across 40+ packages and fixed the broken type declarations.',
  },
  {
    name: 'Novu',
    href: 'https://github.com/novuhq/novu/pull/844',
    role: 'Contributor',
    text: 'The async NestJS module, and the first version of the Rust SDK.',
  },
  {
    name: 'LiveKit',
    href: 'https://github.com/livekit/node-sdks/pull/112',
    role: 'Contributor',
    text: 'Fixed how the Node SDK builds token grants.',
  },
]
