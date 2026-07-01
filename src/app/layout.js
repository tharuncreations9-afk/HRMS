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
  function reloadOnce() {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    var url = new URL(window.location.href);
    url.searchParams.set("_cb", String(Date.now()));
    window.location.replace(url.toString());
  }
  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (!target || (target.tagName !== "SCRIPT" && target.tagName !== "LINK")) return;
      var asset = target.src || target.href;
      if (asset && asset.indexOf("/_next/static/") !== -1) reloadOnce();
    },
    true
  );
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
