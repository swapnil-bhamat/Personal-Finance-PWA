import { AppProps } from 'next/app';
import { useEffect } from 'react';
import '@/styles/main.scss';
import { initializeDatabase } from '../services/db';

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
