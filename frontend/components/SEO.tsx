import Head from 'next/head';
import { DEFAULT_OG_IMAGE, DEFAULT_SEO, SITE_URL } from '../lib/config';
import { SeoAlternateLang } from '../lib/types';

type SEOProps = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  ogUrl?: string;
  alternateLangs?: SeoAlternateLang[];
};

const SEO = ({
  title = DEFAULT_SEO.title,
  description = DEFAULT_SEO.description,
  canonicalPath = '/',
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogUrl,
  alternateLangs = [{ hrefLang: 'ru', href: `${SITE_URL}${canonicalPath}` }],
}: SEOProps) => {
  const canonical = `${SITE_URL}${canonicalPath}`;
  const resolvedOgUrl = ogUrl || canonical;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta property="og:site_name" content="Куфор-Код" />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={resolvedOgUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <link rel="canonical" href={canonical} />
      {alternateLangs.map((lang) => (
        <link key={`${lang.hrefLang}-${lang.href}`} rel="alternate" hrefLang={lang.hrefLang} href={lang.href} />
      ))}
    </Head>
  );
};

export default SEO;
