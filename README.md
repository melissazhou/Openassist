# OpenAssist MDM

Master Data Management platform for IVC Inc. — tracking, reviewing, approving, and auditing master data change requests across PLM, EBS, and WMS systems.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| UI | shadcn/ui (25 components) + Tailwind CSS v4 |
| Data Table | TanStack Table v8 |
| State | TanStack Query v5 |
| Auth | NextAuth v5 (Credentials provider, JWT sessions) |
| ORM | Prisma 6.16.3 |
| Database | PostgreSQL 16 |
| Theme | next-themes (Light / Dark / System) |
| Language | TypeScript 5 |
| Package Manager | pnpm |

## Quick Start (Development)

```bash
# Prerequisites: Node.js 20+, pnpm, Docker (for PostgreSQL)

# 1. Clone & install
git clone <repo-url>
cd OpenAssist
pnpm install

# 2. Start PostgreSQL
docker run -d --name openassist-postgres \
  -e POSTGRES_USER=openassist \
  -e POSTGRES_PASSWORD=openassist2026 \
  -e POSTGRES_DB=openassist \
  -p 5432:5432 postgres:16

# 3. Configure environment
cp .env.example .env   # Edit as needed

# 4. Initialize database
pnpm prisma migrate deploy
pnpm prisma db seed    # Seeds 4 default users

# 5. Run dev server
pnpm dev               # → http://localhost:3000
```

## Default Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| mdm | mdm123 | MDM_MANAGER |
| demo | demo | MDM_ANALYST |
| viewer | viewer | VIEWER |

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes (34 endpoints)
│   │   ├── admin/            # config, health, jobs
│   │   ├── approvals/        # pending approvals
│   │   ├── attachments/      # file upload/download
│   │   ├── auth/             # NextAuth handlers
│   │   ├── items/            # Oracle EBS item search
│   │   ├── mdm/ingest/       # SharePoint ingest API
│   │   ├── notifications/    # notification CRUD
│   │   ├── reports/          # reporting engine
│   │   ├── requests/         # change request CRUD + approve/comments/history
│   │   ├── stats/            # dashboard statistics
│   │   └── users/            # user management + password
│   ├── dashboard/            # 17 pages (protected)
│   │   ├── admin/            # config, health, jobs
│   │   ├── requests/         # list, detail, kanban
│   │   └── ...               # analytics, reports, approvals, etc.
│   └── login/                # public login page
├── components/
│   ├── dashboard/            # shell, theme-toggle, breadcrumb, notification-bell, loading-bar
│   ├── ui/                   # 25 shadcn/ui components
│   ├── error-boundary.tsx
│   ├── command-palette.tsx
│   └── providers.tsx         # SessionProvider + QueryClient + ThemeProvider
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── prisma.ts             # Prisma client singleton
│   ├── validators.ts         # Zod schemas (8 schemas)
│   ├── notifications.ts      # Notification helpers
│   └── utils.ts              # cn() utility
└── proxy.ts                  # Auth proxy (replaces middleware)
```

## Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 部署迁移指南 (新服务器部署/数据库迁移/备份恢复) |
| [API.md](docs/API.md) | API端点参考 (34端点) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 系统架构 (数据模型/认证/前端架构/设计决策) |
| [CHANGELOG.md](docs/CHANGELOG.md) | 版本历史 |

### 规划文档 (`docs/planning/`)

| 文档 | 内容 |
|------|------|
| 00-05 | 升级规划、技术架构、数据库设计、API规范、认证权限、审批工作流 |
| 06-10 | 数据质量规则、系统集成、前端UI规范、部署环境、数据迁移方案 |
| 11-12 | 功能需求清单、开发计划/差距分析 |
| **13** | **v1.1 缺陷分析与开发计划** (最新) |

## Features

- **Change Request Management** — Full CRUD with rich filtering, search, kanban board
- **Approval Workflow** — Submit → Review → Approve/Reject with audit trail
- **Notification System** — Real-time bell notifications for status changes, approvals, comments, assignments
- **TanStack Table** — Column sorting, visibility toggle, row selection, batch operations
- **Dark Mode** — System/Light/Dark theme with full UI adaptation
- **Oracle EBS Integration** — Item Master search via Oracle DB link
- **SharePoint Ingest** — Automated MDM request import from SharePoint
- **Reporting** — 5-dimension reports + SLA metrics
- **Admin Panel** — System config, scheduled jobs, health monitoring
- **Data Dictionary** — 14 MDM field types with descriptions

## License

Internal — IVC Inc.
