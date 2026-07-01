"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#faf7f2",
          color: "#2c2419",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: "420px",
              width: "100%",
              background: "#fff",
              border: "1px solid #d4c9b8",
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <h1 style={{ fontSize: "1.25rem", margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ margin: "0 0 20px", color: "#666", fontSize: "0.9rem" }}>
              The app failed to load. This usually fixes after a refresh when the server was
              updated.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "#b8956a",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "0.95rem",
                cursor: "pointer",
                marginRight: "8px",
              }}
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: "transparent",
                color: "#2c2419",
                border: "1px solid #d4c9b8",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
