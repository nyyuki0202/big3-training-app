import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// ▼ PWAとアイコンの設定 (メタデータ)
export const metadata: Metadata = {
  title: "BIG3 Workout Log",
  description: "BIG3 筋トレ記録アプリ",
  manifest: "/manifest.json", // マニフェストファイルの読み込み
  icons: {
    icon: "/icon-512.png", // Android/PC用
    apple: "/icon-512.png", // iPhone (Apple Touch Icon) 用
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BIG3",
  },
};

// ▼ スマホでの表示設定 (ビューポート)
// 勝手にズームされたりしないようにして、アプリっぽく見せる設定です
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111827", // ダークモードの背景色に合わせる
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}