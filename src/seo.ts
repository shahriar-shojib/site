import { EMAIL, NAME, PHONE, SITE, SOCIALS } from './content'

const IMAGE = `${SITE}/og.jpg`

/** Title, description, share card and canonical address for one page. */
export function seo(page: { path: string; title: string; description: string }) {
  const url = `${SITE}${page.path}`
  return {
    meta: [
      { title: page.title },
      { name: 'description', content: page.description },
      { property: 'og:title', content: page.title },
      { property: 'og:description', content: page.description },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: page.title },
      { name: 'twitter:description', content: page.description },
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}

/** Tags every page shares: the share image and who the site is about. */
export const SHARED_META = [
  { property: 'og:type', content: 'website' },
  { property: 'og:site_name', content: NAME },
  { property: 'og:locale', content: 'en_NZ' },
  { property: 'og:image', content: IMAGE },
  { property: 'og:image:width', content: '1200' },
  { property: 'og:image:height', content: '630' },
  { property: 'og:image:alt', content: 'A dotted drawing of Auckland: the Sky Tower, Rangitoto, the harbour and a pōhutukawa.' },
  { name: 'twitter:card', content: 'summary_large_image' },
  { name: 'twitter:image', content: IMAGE },
  { name: 'author', content: NAME },
  { name: 'theme-color', content: '#faf8f2' },
  {
    'script:ld+json': {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: NAME,
      url: SITE,
      image: IMAGE,
      jobTitle: 'Principal Engineer',
      email: `mailto:${EMAIL}`,
      telephone: PHONE.tel,
      address: { '@type': 'PostalAddress', addressLocality: 'Auckland', addressCountry: 'NZ' },
      sameAs: SOCIALS.filter((s) => s.href.startsWith('http')).map((s) => s.href),
    },
  },
]
