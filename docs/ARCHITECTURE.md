# OpenAssist — 系统架构

## 整体架构

```
┌─────────────┐     ┌──────────────────────────────────────────┐
│   Browser    │────▶│           Next.js 16 (App Router)        │
│  (React SPA) │◀────│                                          │
└─────────────┘     │  ┌─────────┐  ┌──────────┐  ┌─────────┐ │
                    │  │ proxy.ts │  │ API Routes│  │  Pages  │ │
                    │  │ (Auth)   │  │ (34端点)  │  │ (17页面)│ │
                    │  └────┬─────┘  └─────┬─────┘  └─────────┘ │
                    │       │              │                     │
                    │       ▼              ▼                     │
                    │  ┌──────────────────────┐                 │
                    │  │    Prisma ORM         │                 │
                    │  └──────────┬───────────┘                 │
                    └─────────────┼────────────────────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │     PostgreSQL 16            │
                    │  (13 models, 4 migrations)   │
                    └─────────────────────────────┘
                    
                    ┌─────────────────────────────┐
                    │   Oracle EBS (可选, VPN)      │
                    │   Item Master 查询           │
                    └─────────────────────────────┘
```

## 数据模型 (13 Models)

```
User ─┬── ChangeRequest (requestor)
      ├── ChangeRequest (assignee)
      ├── Approval
      ├── Comment
      ├── AuditLog
      ├── Notification
      ├── Session
      └── Account

ChangeRequest ─┬── Approval[]
               ├── Comment[]
               ├── Attachment[]
               └── AuditLog[]

SystemConfig (独立, key-value)
ScheduledJob ── JobRun[]
```

### 核心枚举

| Enum | Values |
|------|--------|
| Role | ADMIN, MDM_MANAGER, MDM_ANALYST, REQUESTOR, VIEWER, SYSTEM |
| RequestStatus | NEW → PENDING_REVIEW → IN_PROGRESS → PENDING_APPROVAL → APPROVED/REJECTED → COMPLETED/CANCELLED |
| ChangeCategory | ITEM_MASTER, BOM, ROUTING, VENDOR, CUSTOMER, PRICE, WAREHOUSE, SYSTEM_CONFIG, OTHER |
| Priority | LOW, MEDIUM, HIGH, URGENT |
| NotificationType | STATUS_CHANGE, APPROVAL_REQUEST, APPROVAL_RESULT, COMMENT, ASSIGNMENT, SYSTEM |

## 认证与授权

```
NextAuth v5 (Credentials Provider)
├── JWT Session Strategy (无DB session存储)
├── proxy.ts → 保护 /dashboard/** 和 /api/mdm/**
├── API层各端点手动检查 session + role
└── 角色层级:
    ADMIN > MDM_MANAGER > MDM_ANALYST > REQUESTOR > VIEWER
```

**权限矩阵：**

| 操作 | ADMIN | MDM_MANAGER | MDM_ANALYST | REQUESTOR | VIEWER |
|------|-------|-------------|-------------|-----------|--------|
| 查看请求 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 创建请求 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 审批请求 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 删除请求 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 管理用户 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 系统配置 | ✅ | ❌ | ❌ | ❌ | ❌ |

## 前端架构

```
Providers (SessionProvider + QueryClient + ThemeProvider)
└── DashboardShell
    ├── Sidebar (Collapsible groups: MDM/Reports/Admin)
    ├── Header (NotificationBell + ThemeToggle + Avatar + CommandPalette)
    ├── LoadingBar (route transition)
    ├── PageBreadcrumb (auto-generated)
    └── ErrorBoundary
        └── Page Content
```

**关键技术选型：**

| 需求 | 方案 |
|------|------|
| 服务端状态 | TanStack Query (自动缓存/重试/失效) |
| 表格 | TanStack Table (排序/列可见性/行选择/批量操作) |
| 表单验证 | Zod (8个schema, 前后端共享) |
| UI组件 | shadcn/ui (25个组件, 可定制) |
| 主题 | next-themes (class strategy, system/light/dark) |
| 通知 | Sonner (toast) + 自建Notification系统 (Popover) |
| 命令面板 | cmdk (⌘K 快捷导航) |

## 通知系统

```
用户操作 (状态变更/审批/评论/分配)
    │
    ▼
API Route → notifications.ts helper
    │
    ▼
Notification 写入 PostgreSQL
    │
    ▼
NotificationBell 组件 (30s轮询)
    │
    ▼
Popover面板 → 标记已读 / 跳转详情
```

**触发点：**
- `PATCH /api/requests/[id]` → 状态变更通知 + 分配通知
- `POST /api/requests/[id]/approve` → 审批结果通知
- `POST /api/requests/[id]/comments` → 评论通知

## 目录约定

```
src/app/api/         → Next.js Route Handlers (RESTful)
src/app/dashboard/   → App Router Pages (SSR + Client)
src/components/ui/   → shadcn/ui 原子组件
src/components/dashboard/ → 业务组件 (shell, notifications, etc.)
src/lib/             → 共享库 (auth, prisma, validators, notifications)
src/proxy.ts         → 请求代理/认证中间件
prisma/schema.prisma → 数据模型定义
prisma/migrations/   → 数据库迁移历史
prisma/seed.ts       → 种子数据
```

## 外部集成

### Oracle EBS Item Master
- 通过 `oracledb` (thick mode) 直连 Oracle DB
- 需要 Oracle Instant Client + VPN
- 只读查询，用于Item信息校验

### SharePoint MDM Ingest
- `POST /api/mdm/ingest` 接收外部解析后的变更请求
- API Key认证 (`x-api-key` header)
- 支持批量创建 + 更新（基于sourceRef去重）

## 设计决策

1. **JWT > DB Session** — 减少数据库查询，适合内网低延迟场景
2. **Server-side分页 + Client-side排序** — 数据量大时服务端分页，小页内客户端排序
3. **proxy.ts > middleware.ts** — Next.js 16推荐，避免废弃警告
4. **Notification轮询 > WebSocket** — 简单可靠，30s间隔对MDM场景足够
5. **pnpm > npm** — 更快安装，严格依赖管理，磁盘占用小
6. **shadcn/ui > 完整组件库** — 可定制源码，无运行时依赖锁定
