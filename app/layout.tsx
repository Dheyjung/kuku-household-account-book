import type { Metadata, Viewport } from "next";
import "./globals.css";
import LockScreen from "./lock-screen";
import SwRegister from "./sw-register";

export const metadata: Metadata = {
  title: "꾸꾸 가계부",
  description: "나만의 키치한 가계부",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "꾸꾸 가계부", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffe48a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <LockScreen>{children}</LockScreen>
        <SwRegister />
      </body>
    </html>
  );
}
