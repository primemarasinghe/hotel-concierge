'use client';
import { usePathname } from 'next/navigation';
import Nav from './Nav';
import Footer from './Footer';
import ChatWidget from './ChatWidget';

export default function SiteShell({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}
