import "./globals.css";

export const metadata = {
  title: "心引力 Gravity",
  description: "不按你是谁，按你此刻的心情，找此刻的人。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
