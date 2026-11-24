import './globals.css';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import AuthProvider from '../components/AuthProvider';

export const metadata = {
  title: 'Leisureville Sigiriya — Boutique Villa, Sri Lanka',
  description:
    'A secluded boutique villa at the heart of Sri Lanka\'s Cultural Triangle. ' +
    'Steps from Sigiriya Rock, surrounded by jungle and paddy fields.',
  keywords: 'Sigiriya, Sri Lanka, boutique villa, hotel, cultural triangle, Leisureville',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
