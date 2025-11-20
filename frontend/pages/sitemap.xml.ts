import { GetServerSideProps } from 'next';
import axios from 'axios';
import { API_BASE_URL, SITE_URL } from '../lib/config';
import { Ad } from '../lib/types';
import { slugify } from '../lib/slug';

const toUrlTag = (loc: string, priority = '0.8', changefreq = 'daily', lastmod?: string) => {
  return `  <url>\n    <loc>${loc}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
};

const Sitemap = () => null;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const adsResponse = await axios.get(`${API_BASE_URL}/ads`, { params: { limit: 5000 } });
    const ads: Ad[] = adsResponse.data ?? [];
    const adUrls = ads.map((ad) => {
      const slug = slugify(ad.title);
      const loc = `${SITE_URL}/ads/${ad._id}-${slug}`;
      const lastmod = ad.updatedAt || ad.createdAt;
      return toUrlTag(loc, '0.8', 'daily', lastmod?.slice(0, 10));
    });

    const categories = Array.from(new Set(ads.map((ad) => ad.category).filter(Boolean))) as string[];
    const categoryUrls = categories.map((category) => toUrlTag(`${SITE_URL}/category/${category}`, '0.6', 'weekly'));

    const staticUrls = [
      toUrlTag(`${SITE_URL}/`, '1.0', 'hourly'),
      toUrlTag(`${SITE_URL}/search`, '0.6', 'daily'),
      toUrlTag(`${SITE_URL}/about`, '0.5', 'monthly'),
      toUrlTag(`${SITE_URL}/contacts`, '0.5', 'monthly'),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...categoryUrls, ...adUrls].join('\n')}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.write(xml);
    res.end();
  } catch (error) {
    res.statusCode = 500;
    res.end();
  }

  return {
    props: {},
  };
};

export default Sitemap;
