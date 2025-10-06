import type { AppProps } from "next/app";
import "../app/globals.css";
import { Toaster } from "react-hot-toast";
import Head from "next/head";
// import { useEffect } from "react";
import ServerStatusHandler from "@/components/ServerStatusHandler";
import { useEffect } from "react";

function MyApp({ Component, pageProps }: AppProps) {
  // useEffect(() => {
  //   const disableRightClick = (e: { preventDefault: () => void; }) => {
  //     e.preventDefault();
  //   };
  //   document.addEventListener("contextmenu", disableRightClick);
  //   return () => {
  //     document.removeEventListener("contextmenu", disableRightClick);
  //   };
  // }, []);

  return (
    <>
      <ServerStatusHandler>
        <Head>
          <meta name="application-name" content="Fans Cosa" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content="Fans Cosa" />
          <meta name="description" content="Fans Control Glucosa" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-config" content="/browserconfig.xml" />
          <meta name="msapplication-TileColor" content="#0055ff" />
          <meta name="msapplication-tap-highlight" content="no" />
          <meta name="theme-color" content="#0055ff" />

          <link rel="apple-touch-icon" href="/icon-192x192.png" />
          <link
            rel="icon"
            type="image/png"
            sizes="192x192"
            href="/icon-192x192.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="512x512"
            href="/icon-512x512.png"
          />
        </Head>
        <Toaster position="top-right" />
        {/* <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        /> */}
        <Component {...pageProps} />
      </ServerStatusHandler>
    </>
  );
}

export default MyApp;
