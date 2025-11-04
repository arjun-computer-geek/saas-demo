import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-gray-600">Multi-tenant SaaS demo with Super Admin, Admin, and Users.</p>
      <div className="flex gap-3">
        <Link href="/auth/signin" className="px-4 py-2 bg-black text-white rounded">Sign in</Link>
        <Link href="/dashboard" className="px-4 py-2 border rounded">Go to dashboard</Link>
      </div>
    </div>
  );
}

