import '../styles/globals.css'
import type { AppProps } from 'next/app'
import NextNProgress from "nextjs-progressbar";
import { MantineProvider } from '@mantine/core';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          /** Put your mantine theme override here */
          colorScheme: 'light',
        }}
      >
        <NextNProgress />
        <Component {...pageProps} />
      </MantineProvider>
    </>
  )
}
