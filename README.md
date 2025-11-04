# SaaS Multitenant Demo (Next.js + Express + MongoDB)

- Next.js app (App Router) for UI
- Express API server with JWT auth
- MongoDB via Mongoose
- Multi-tenant by domain, Super Admin and Admin roles, feature flags, invites

## Quick Start

1) Environment (Windows PowerShell example):
```
$env:MONGODB_URI="mongodb://127.0.0.1:27017/saas_demo"
$env:JWT_SECRET="replace-with-strong-secret"
$env:SUPER_ADMIN_EMAIL="super@example.com"
$env:SUPER_ADMIN_PASSWORD="superpassword"
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```
2) Install
```
npm install
```
3) Run
```
# Terminal A
npm run server
# Terminal B
npm run dev
```

Login at /auth/signin using SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD.

## Key Features
- Super Admin
  - Create organizations, toggle enable/disable
  - Manage org domains (via API; UI basic toggle/creation)
  - Set org feature flags (/super-admin/features)
  - Create Admins for an org (/super-admin/admins)
- Admin
  - View org users, enable/disable
  - Invite users/admins (token displayed; accept at /invite/{token})
- User
  - Dashboard shows effective feature flags from org + user
- Multi-domain
  - Admin and user scoped endpoints enforce domain via `x-org-domain` header

## Notes
- Invites use token responses (console/email integration can be added with Nodemailer)
- For local multi-domain, add domains to org and use matching browser host

