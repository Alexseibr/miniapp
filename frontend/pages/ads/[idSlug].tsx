import { GetServerSideProps } from 'next';
import Head from 'next/head';
import axios from 'axios';
import SEO from '../../components/SEO';
import { API_BASE_URL, SITE_URL } from '../../lib/config';
import { Ad, AdOwner } from '../../lib/types';
import { parseIdFromParam, slugify } from '../../lib/slug';

interface AdPageProps {
  ad: Ad;
  owner?: AdOwner;
  slug: string;
}

const AdPage = ({ ad, owner, slug }: AdPageProps) => {
  const canonicalPath = `/ads/${ad._id}-${slug}`;
  const descriptionShort = ad.description.length > 160 ? `${ad.description.slice(0, 157)}...` : ad.description;
  const mainImage = ad.photos?.[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ad.title,
    image: ad.photos || [],
    description: descriptionShort,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BYN',
      price: ad.price?.toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}${canonicalPath}`,
    },
    brand: 'Куфор-Код',
  };

  return (
    <>
      <SEO
        title={`${ad.title} — купить за ${ad.price} BYN — Куфор-Код`}
        description={descriptionShort}
        canonicalPath={canonicalPath}
        ogType="product"
        ogImage={mainImage}
        ogUrl={`${SITE_URL}${canonicalPath}`}
      />
      <article>
        <h1>{ad.title}</h1>
        <p>
          <strong>Цена:</strong> {ad.price} BYN
        </p>
        {mainImage && <img src={mainImage} alt={ad.title} loading="lazy" />}
        <p>{ad.description}</p>
        {ad.category && <span className="badge">Категория: {ad.category}</span>}
        {ad.subcategory && <span className="badge">Подкатегория: {ad.subcategory}</span>}
        {owner && (
          <p>
            Продавец: {owner.firstName} {owner.lastName || ''} {owner.username && `(@${owner.username})`}
          </p>
        )}
      </article>
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<AdPageProps> = async ({ params, res }) => {
  const adId = parseIdFromParam(params?.idSlug);
  if (!adId) {
    return { notFound: true };
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/ads/${adId}`);
    const { ad, owner } = response.data as { ad: Ad; owner?: AdOwner };
    if (!ad) {
      return { notFound: true };
    }

    const slug = slugify(ad.title);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return {
      props: { ad, owner, slug },
    };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return { notFound: true };
    }

    return { notFound: true };
  }
};

export default AdPage;
