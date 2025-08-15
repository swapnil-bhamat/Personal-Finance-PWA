import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#007bff" />
        <meta name="description" content="Personal Finance Management Application" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Finance" />
        <meta name="apple-mobile-web-app-title" content="Finance" />
        <meta name="msapplication-starturl" content="/" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/pwa-192x192.png" />
        <link rel="mask-icon" href="/masked-icon.svg" color="#007bff" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
