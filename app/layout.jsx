export const metadata = {
  title: 'SaaS Multitenant Demo',
  description: 'Super admin controls, admin invites, multi-domain tenants',
};

import './globals.css';
import NavClient from '../components/NavClient';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="font-semibold">SaaS Demo</div>
              <NavClient />
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

