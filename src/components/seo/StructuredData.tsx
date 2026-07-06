interface StructuredDataProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>
}

export default function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}

export function buildWebsiteSchema(appUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'هبة الشريف',
    alternateName: 'Heba ElSherif',
    url: appUrl,
    inLanguage: 'ar-EG',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${appUrl}/articles?query={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildOrganizationSchema(appUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'هبة الشريف',
    url: appUrl,
    logo: `${appUrl}/images/brand/logo-symbol.png`,
    sameAs: [],
    description: 'منصة عربية فاخرة للجلسات الفردية، التعلم العاطفي، الكتب الرقمية، ورحلات الوعي بالذات.',
  }
}
