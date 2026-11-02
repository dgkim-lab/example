import "./globals.css";

export const metadata = {
  title: "Google Authenticator 2FA Demo",
  description: "A simple TOTP 2FA demo",
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
