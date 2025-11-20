import { ReactNode } from 'react';
import Head from 'next/head';
import SEO from './SEO';

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SEO />
      <main>{children}</main>
    </>
  );
};

export default Layout;
