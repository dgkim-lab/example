import './globals.css';

export const metadata = { title: 'Relay Studio', description: 'A two-agent AI conversation studio' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
