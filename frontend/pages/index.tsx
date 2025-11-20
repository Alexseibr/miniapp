import { GetServerSideProps } from 'next';
import Link from 'next/link';
import axios from 'axios';
import SEO from '../components/SEO';
import { API_BASE_URL } from '../lib/config';
import { Ad } from '../lib/types';
import { slugify } from '../lib/slug';

interface HomeProps {
  ads: Ad[];
}

const HomePage = ({ ads }: HomeProps) => {
  return (
    <>
      <SEO
        title="Маркетплейс Куфор-Код — объявления рядом с вами"
        description="Куфор-Код — маркетплейс товаров и услуг от фермеров и местных продавцов. Найдите свежие продукты и услуги рядом с вами."
        canonicalPath="/"
      />
      <header>
        <div>
          <h1>Маркетплейс Куфор-Код</h1>
          <p>Свежие объявления от фермеров и продавцов вашего региона.</p>
        </div>
        <nav>
          <Link href="/search">Поиск</Link>
        </nav>
      </header>
      <section>
        <h2>Новые объявления</h2>
        <div className="card-list">
          {ads.map((ad) => {
            const slug = slugify(ad.title);
            const href = `/ads/${ad._id}-${slug}`;
            const image = ad.photos?.[0];
            return (
              <article key={ad._id} className="card">
                {image ? <img src={image} alt={ad.title} loading="lazy" /> : <div className="badge">Без фото</div>}
                <h2>
                  <Link href={href}>{ad.title}</Link>
                </h2>
                <p>{ad.description.slice(0, 120)}...</p>
                <p className="badge">Цена: {ad.price} BYN</p>
                {ad.category && <span className="badge">{ad.category}</span>}
                {ad.subcategory && <span className="badge">{ad.subcategory}</span>}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ads`, {
      params: { limit: 40 },
    });

    const ads: Ad[] = response.data ?? [];
    return {
      props: { ads },
    };
  } catch (error) {
    return {
      props: { ads: [] },
    };
  }
};

export default HomePage;
