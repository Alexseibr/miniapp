import { GetServerSideProps } from 'next';
import Link from 'next/link';
import axios from 'axios';
import SEO from '../../components/SEO';
import { API_BASE_URL } from '../../lib/config';
import { Ad } from '../../lib/types';
import { slugify } from '../../lib/slug';

interface CategoryPageProps {
  slug: string;
  ads: Ad[];
}

const CategoryPage = ({ slug, ads }: CategoryPageProps) => {
  const title = `Категория ${slug} — Куфор-Код`;
  const description = `Объявления категории ${slug} на маркетплейсе Куфор-Код.`;
  return (
    <>
      <SEO title={title} description={description} canonicalPath={`/category/${slug}`} />
      <header>
        <div>
          <h1>Категория: {slug}</h1>
          <p>Подборка объявлений по категории.</p>
        </div>
        <nav>
          <Link href="/">На главную</Link>
        </nav>
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

export const getServerSideProps: GetServerSideProps<CategoryPageProps> = async ({ params }) => {
  const slug = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;
  if (!slug) {
    return { notFound: true };
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/ads`, {
      params: { category: slug },
    });
    const ads: Ad[] = response.data ?? [];
    return {
      props: { slug, ads },
    };
  } catch (error) {
    return { notFound: true };
  }
};

export default CategoryPage;
