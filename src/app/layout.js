import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ChunkErrorRecovery } from "@/components/providers/chunk-error-recovery";
import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

export const metadata = {
  title: "VLJ HRMS - Employee Management System",
  description: "VLJ Employee Management System",
  icons: { icon: "/images/vlj-logo.png" },
};

const chunkRecoveryScript = `
(function () {
  var key = "emp_chunk_reload";
  var tries = parseInt(sessionStorage.getItem(key) || "0", 10);

  function stripCb() {
    try {
      var url = new URL(window.location.href);
      if (!url.searchParams.has("_cb")) return;
      url.searchParams.delete("_cb");
      var qs = url.searchParams.toString();
      window.history.replaceState(null, "", url.pathname + (qs ? "?" + qs : "") + url.hash);
    } catch (e) {}
  }

  stripCb();

  function reloadOnce() {
    if (tries >= 2) return;
    tries += 1;
    sessionStorage.setItem(key, String(tries));
    if (window.caches && window.caches.keys) {
      window.caches.keys().then(function (names) {
        names.forEach(function (name) { window.caches.delete(name); });
      });
    }
    window.location.reload();
  }

  function isChunkFailure(message) {
    if (!message) return false;
    var text = String(message);
    return (
      text.indexOf("Loading chunk") !== -1 ||
      text.indexOf("ChunkLoadError") !== -1 ||
      text.indexOf("Failed to fetch dynamically imported module") !== -1
    );
  }

  window.addEventListener(
    "error",
    function (event) {
      if (isChunkFailure(event && event.message)) reloadOnce();
      var target = event && event.target;
      if (!target || (target.tagName !== "SCRIPT" && target.tagName !== "LINK")) return;
      var asset = target.src || target.href;
      if (asset && asset.indexOf("/_next/static/") !== -1) reloadOnce();
    },
    true
  );

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event && event.reason;
    if (isChunkFailure(reason && reason.message ? reason.message : String(reason || ""))) reloadOnce();
  });

  window.addEventListener("load", function () {
    sessionStorage.removeItem(key);
    stripCb();
  });
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }} />
      </head>
      <body className={`${inter.variable} ${display.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ChunkErrorRecovery />
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
