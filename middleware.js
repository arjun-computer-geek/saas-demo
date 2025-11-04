import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || '';

  // Pass through the resolved tenant domain so server routes can use it
  const response = NextResponse.next();
  response.headers.set('x-tenant-host', host);
  response.headers.set('x-tenant-origin', `${url.protocol}//${host}`);
  return response;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};

