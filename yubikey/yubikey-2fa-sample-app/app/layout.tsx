import "./globals.css";

export const metadata = {
  title: "YubiKey 2FA Demo",
  description: "A simple WebAuthn demo",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
