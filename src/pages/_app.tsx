import { AppProps } from 'next/app';
import '@/styles/main.scss';

export default function App({ Component, pageProps }: AppProps) {
  // No Firestore sync here; handled after authentication in Layout

  return <Component {...pageProps} />;
}
