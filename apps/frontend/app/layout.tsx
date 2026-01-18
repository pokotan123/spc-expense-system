import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SPC経費精算システム',
  description: 'SPC経費精算システムのMVP版',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
