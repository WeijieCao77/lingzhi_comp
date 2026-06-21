import "./globals.css";

export const metadata = {
  title: "心引力 Gravity",
  description: "在你最有情绪的那一刻，找到和你处在同一片情绪星空下的人。",
};

// 移动端适配：按设备宽度渲染（否则手机会按桌面宽缩放，整页变小）
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07061a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
