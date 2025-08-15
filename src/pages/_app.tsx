import { AppProps } from 'next/app';
import { useEffect } from 'react';
import { initializeDatabase } from '@/services/db';
import '@/styles/main.scss';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize database on client side
    fetch('/data.json')
      .then((response) => response.json())
      .then((data) => {
        initializeDatabase(data)
          .catch((error) => {
            console.error('Failed to initialize database:', error);
          });
      })
      .catch((error) => {
        console.error('Failed to load initial data:', error);
      });
  }, []);

  return <Component {...pageProps} />;
}
