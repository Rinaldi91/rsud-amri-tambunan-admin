// pages/offline.tsx
import React from "react";
import Head from "next/head";

const Offline: React.FC = () => {
  const handleReload = () => {
    // Arahkan pengguna ke halaman login
    window.location.href = "/login"; // Ganti dengan URL halaman login Anda
  };
  return (
    <>
      <Head>
        <title>Connection Error - Fans Cosa</title>
      </Head>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          textAlign: "center",
          backgroundColor: "#f9fafc",
          padding: "1rem",
        }}
      >
       
        <h1
          style={{
            fontSize: "1.5rem",
            color: "#0055ff",
            marginBottom: "1rem",
            fontWeight: "bold",
          }}
        >
          Internet Connection Error
        </h1>
        <p
          style={{
            fontSize: "1rem",
            maxWidth: "400px",
            color: "#4a5568",
            marginBottom: "1.5rem",
          }}
        >
          Sorry, our server is experiencing problems. Please try again.
        </p>
        <button
          onClick={handleReload}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0055ff",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0, 85, 255, 0.15)",
          }}
        >
          Reload
        </button>
      </div>
    </>
  );
};

export default Offline;
