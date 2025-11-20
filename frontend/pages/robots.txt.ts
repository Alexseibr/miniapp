import { GetServerSideProps } from 'next';
import { SITE_URL } from '../lib/config';

const Robots = () => null;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const content = `User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /chat\nDisallow: /login\n\nSitemap: ${SITE_URL}/sitemap.xml`;
  res.setHeader('Content-Type', 'text/plain');
  res.write(content);
  res.end();
  return {
    props: {},
  };
};

export default Robots;
