# 🚀 SaaS Multi-Tenant Platform

A **multi-tenant SaaS application** with complete **role-based access control**, **organization management**, and **secure cookie authentication** — built using **Next.js (frontend)** and **Node.js + Express + MongoDB (backend)**.

---

## 🧱 Overview

This project implements a **multi-tenant SaaS architecture** with 3 access levels:

| Role | Description |
|------|--------------|
| 🧑‍💼 **Super Admin** | Manages organizations and admins |
| 👨‍💻 **Admin** | Manages organization users and items |
| 👤 **User** | Can perform CRUD operations on items (todos) |

It supports:
- ✅ Cookie-based authentication
- ✅ Role-based authorization (RBAC)
- ✅ Multi-organization data isolation
- ✅ Invite-based user onboarding
- ✅ Session invalidation when org is disabled or deleted

---

## ⚙️ Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | Next.js 14 (App Router), TypeScript |
| **State Management** | Zustand |
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB (Mongoose) |
| **Auth** | HTTP-only cookies + session tokens |
| **Styling** | Tailwind CSS |
| **Security** | bcrypt, crypto, JWT-style session signing |

---

## 🏗️ Architecture
```
/backend
  /models
    User.js
    Organization.js
    Membership.js
    Item.js
    Invite.js
    Session.js
  /routes
    authRoutes.js
    userRoutes.js
    orgRoutes.js
    itemRoutes.js
    inviteRoutes.js
  /middlewares
    authMiddleware.js
    roleMiddleware.js
  /config
    env.js
  app.js
  server.js

/frontend
  /app
    /(auth)/login/page.tsx
    /(private)/
      /super/
        organizations/page.tsx
        admins/page.tsx
      /admin/
        users/page.tsx
        invite/page.tsx
      /dashboard/page.tsx
      /items/page.tsx
    /invite/[token]/page.tsx
  /store/auth.ts
  /lib/api.ts

```


---

## 🔐 Authentication Flow

1. User logs in via `/auth/login`
2. Server validates credentials and org membership
3. Session is created and stored in DB
4. Cookie `session` is issued (HTTP-only, secure)
5. Frontend calls `/auth/me` to restore session

**Session lifetime:** 7 days  
**Session invalidation:** if organization is disabled/deleted or `authVersion` changes

---

## 👑 Role-Based Access Control (RBAC)

| Role | Level | Permissions |
|-------|--------|-------------|
| **Super Admin** | Global | Manage organizations, admins |
| **Admin** | Per-organization | Manage users, CRUD items |
| **User** | Per-organization | CRUD items only |

Roles are stored in:
- `user.isSuper` → for platform level
- `membership.role` → for organization level (`ADMIN` / `USER`)

---

## 💡 Feature Overview

### 🧭 Super Admin
- Manage organizations (Create, Disable, Enable, Delete, Undelete)
- Assign or remove organization admins
- Reset user passwords
- View all admins and members

### 🧭 Admin
- Manage organization users (promote/demote/disable)
- Invite new users
- CRUD on organization items (todos)

### 🧭 User
- CRUD on own organization’s todos

---

## 🌐 API Endpoints

### 🔐 Auth Routes (`/auth`)
| Method | Endpoint | Description |
|---------|-----------|-------------|
| POST | `/auth/login` | Log in user/admin/super admin |
| GET | `/auth/me` | Get current session user |
| POST | `/auth/logout` | End user session |

---

### 🏢 Organization Routes (`/orgs`)
| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/orgs` | List all organizations |
| POST | `/orgs` | Create new organization |
| POST | `/orgs/:id/disable` | Disable organization |
| POST | `/orgs/:id/enable` | Enable organization |
| POST | `/orgs/:id/undelete` | Restore deleted organization |
| DELETE | `/orgs/:id` | Soft delete organization |

---

### 👤 User Routes (`/users`)
| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/users` | List all users in org (admin only) |
| POST | `/users/invite` | Send invitation to new user |
| GET | `/users/invite/:token` | Get invite details |
| POST | `/users/invite/:token/accept` | Accept invite and create user |
| GET | `/users/members` | Get all org members |
| POST | `/users/members/:userId/role` | Change user role (ADMIN/USER) |
| POST | `/users/members/:userId/disable` | Toggle disable/enable user |

---

### ✅ Item Routes (`/items`)
| Method | Endpoint | Description | Roles |
|---------|-----------|-------------|--------|
| GET | `/items` | List todos | USER + ADMIN |
| POST | `/items` | Create todo | USER + ADMIN |
| PUT | `/items/:id` | Update todo | USER + ADMIN |
| DELETE | `/items/:id` | Delete todo | ADMIN only |

---

## 🖥️ Frontend Overview

- Built in **Next.js 14 App Router**
- **Zustand** manages user/org state
- **Middleware** protects routes based on cookie session and user role
- **Dynamic navigation** per role:
  - Super Admin → `/super/organizations`, `/super/admins`
  - Admin → `/admin/users`, `/items`
  - User → `/items`

---

## 💾 Database Schema

### User
| Field | Type | Description |
|--------|------|-------------|
| email | String | Unique email |
| password | String | Hashed (bcrypt) |
| name | String | Display name |
| isSuper | Boolean | Global super admin flag |

### Organization
| Field | Type | Description |
|--------|------|-------------|
| name | String | Org name |
| status | String | ACTIVE / DISABLED / DELETED |
| authVersion | Number | Used for session invalidation |

### Membership
| Field | Type | Description |
|--------|------|-------------|
| userId | ObjectId | Linked user |
| orgId | ObjectId | Linked organization |
| role | String | ADMIN / USER |
| disabled | Boolean | Org-level suspension flag |

### Item
| Field | Type | Description |
|--------|------|-------------|
| orgId | ObjectId | Linked org |
| title | String | Todo title |
| content | String | Todo description |
| createdBy | ObjectId | Creator user id |

### Invite
| Field | Type | Description |
|--------|------|-------------|
| token | String | Unique invitation token |
| email | String | Invited email |
| orgId | ObjectId | Organization reference |
| role | String | USER / ADMIN |
| expiresAt | Date | Expiry (7 days) |
| accepted | Boolean | Whether accepted |

---

## 🚀 Setup & Environment

### 🧩 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```
Create `.env` file:
```
MONGO_URI=mongodb://localhost:27017/saas
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
COOKIE_NAME=session
NODE_ENV=development
```
### 🧩 2. Frontend Setup
```
cd frontend
npm install
npm run dev
```
The app runs at `http://localhost:3000.`

---


### 🧠 Future Improvements

 * Email notifications for invites
 * Audit logs for admin actions
 * Organization-level analytics
 * SSO or 2FA integration
 * Pagination and search
 * Super admin “impersonate” feature
 * Docker + Nginx deployment support

---

### 🏁 Conclusion

This project demonstrates a production-ready SaaS architecture with:

* Multi-tenant org isolation
* Full role-based permissions
* Secure cookie authentication
* Extendable modular structure

It’s designed for real SaaS platforms that need separate customers, organizations, and admin management.