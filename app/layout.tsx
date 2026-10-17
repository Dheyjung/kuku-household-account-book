import type { Metadata, Viewport } from "next";
import "./globals.css";
import LockScreen from "./lock-screen";

export const metadata: Metadata = {
  title: "꾸꾸 가계부",
  description: "나만의 키치한 가계부",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <LockScreen>{children}</LockScreen>
      </body>
    </html>
  );
}
