import { GetServerSideProps } from 'next';
import Link from 'next/link';
import axios from 'axios';
import SEO from '../components/SEO';
import { API_BASE_URL } from '../lib/config';
import { Ad } from '../lib/types';
import { slugify } from '../lib/slug';

interface SearchPageProps {
  ads: Ad[];
  query: Record<string, string | string[]>;
}

const SearchPage = ({ ads, query }: SearchPageProps) => {
  const readableQuery = query.q || query.search || '';
  const title = readableQuery ? `Поиск: ${readableQuery} — Куфор-Код` : 'Поиск объявлений — Куфор-Код';
  const description = readableQuery
    ? `Результаты поиска по запросу ${readableQuery} на маркетплейсе Куфор-Код.`
    : 'Каталог объявлений по фильтрам на маркетплейсе Куфор-Код.';

  return (
    <>
      <SEO title={title} description={description} canonicalPath="/search" />
      <header>
        <h1>Поиск объявлений</h1>
        <p>Найдите товары и услуги по фильтрам.</p>
      </header>
      <div className="card-list">
        {ads.map((ad) => {
          const adSlug = slugify(ad.title);
          return (
            <article key={ad._id} className="card">
              <h2>
                <Link href={`/ads/${ad._id}-${adSlug}`}>{ad.title}</Link>
              </h2>
              <p>{ad.description.slice(0, 120)}...</p>
              <p className="badge">{ad.price} BYN</p>
            </article>
          );
        })}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<SearchPageProps> = async ({ query }) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ads`, {
      params: query,
    });

    const ads: Ad[] = response.data ?? [];
    return {
      props: { ads, query },
    };
  } catch (error) {
    return {
      props: { ads: [], query },
    };
  }
};

export default SearchPage;
