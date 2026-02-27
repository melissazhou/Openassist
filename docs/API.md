# OpenAssist API Reference

Base URL: `http://localhost:3000/api`

所有 `/dashboard` 和 `/api/mdm` 路由受 proxy.ts 保护，需要有效的NextAuth session。

---

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signin` | NextAuth登录 |
| POST | `/api/auth/signout` | NextAuth登出 |
| GET | `/api/auth/session` | 获取当前session |

---

## Change Requests

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/requests` | 列表（分页、搜索、筛选） | ✅ |
| POST | `/api/requests` | 创建变更请求 | ✅ |
| GET | `/api/requests/[id]` | 获取详情（含comments/approvals/attachments/auditLogs） | ✅ |
| PATCH | `/api/requests/[id]` | 更新（状态、字段、分配） | ✅ |
| DELETE | `/api/requests/[id]` | 删除（ADMIN/MDM_MANAGER） | ✅ |
| POST | `/api/requests/[id]/submit` | 提交审批 | ✅ |
| POST | `/api/requests/[id]/approve` | 审批（approve/reject） | ✅ |
| POST | `/api/requests/[id]/comments` | 添加评论 | ✅ |
| GET | `/api/requests/[id]/history` | 变更历史 | ✅ |
| POST | `/api/requests/[id]/attachments` | 上传附件（multipart/form-data） | ✅ |
| GET | `/api/requests/export` | 导出CSV | ✅ |
| POST | `/api/requests/import` | 批量导入（JSON） | ✅ |

### GET /api/requests — Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| page | number | 页码（默认1） |
| pageSize | number | 每页数量（默认20，最大100） |
| search | string | 搜索title/requestNumber/itemCode |
| status | string | 状态筛选 (NEW/PENDING_REVIEW/IN_PROGRESS/...) |
| category | string | 分类筛选 (ITEM_MASTER/BOM/...) |
| mdmField | string | MDM字段筛选 |
| org | string | 组织筛选 (AND/DDR/WOD/...) |

### POST /api/requests — Body (Zod validated)

```json
{
  "title": "string (required, 1-500)",
  "description": "string (optional)",
  "category": "ITEM_MASTER|BOM|ROUTING|VENDOR|CUSTOMER|PRICE|WAREHOUSE|SYSTEM_CONFIG|OTHER",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "itemCode": "string (optional)",
  "oldValue": "string (optional)",
  "newValue": "string (optional)",
  "targetSystems": ["PLM", "EBS"],
  "requestorName": "string (optional)"
}
```

### POST /api/requests/[id]/approve — Body

```json
{
  "action": "approve|reject",
  "comment": "string (optional, max 2000)"
}
```

---

## Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | 当前用户通知列表 | ✅ |
| PATCH | `/api/notifications` | 标记已读 | ✅ |

### GET /api/notifications — Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| unread | "true" | 仅未读 |
| limit | number | 数量（默认20，最大50） |

### PATCH /api/notifications — Body

```json
{ "ids": ["id1", "id2"] }   // 标记指定通知
// 或
{ "all": true }              // 标记全部已读
```

**通知类型：** STATUS_CHANGE, APPROVAL_REQUEST, APPROVAL_RESULT, COMMENT, ASSIGNMENT, SYSTEM

---

## Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | 用户列表 | ✅ |
| POST | `/api/users` | 创建用户 | ✅ ADMIN |
| PATCH | `/api/users/[id]` | 更新用户（角色/状态） | ✅ ADMIN |
| PATCH | `/api/users/me/password` | 修改密码 | ✅ |

---

## Approvals

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/approvals/pending` | 当前用户待审批列表 | ✅ |

---

## Reports & Stats

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/stats` | Dashboard KPI统计 | ✅ |
| GET | `/api/reports?type=<type>` | 报表数据 | ✅ |

**Report types:** summary, by-status, by-category, by-field, by-org, sla

---

## Item Master (Oracle EBS)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/items/search?q=<query>` | 搜索Oracle EBS Item | ✅ |
| GET | `/api/items/[itemNumber]` | 获取单个Item详情 | ✅ |

> 需要Oracle Instant Client + VPN连通EBS数据库

---

## MDM Ingest

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/mdm/ingest` | 外部系统导入变更请求 | API Key |

**Header:** `x-api-key: <INGEST_API_KEY>`

---

## Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/config` | 获取系统配置 | ✅ ADMIN |
| PUT | `/api/admin/config` | 批量更新配置 | ✅ ADMIN |
| POST | `/api/admin/config/seed` | 初始化默认配置 | ✅ ADMIN |
| GET | `/api/admin/health` | 系统健康检查 | ✅ ADMIN |
| GET | `/api/admin/jobs` | 定时任务列表 | ✅ ADMIN |
| POST | `/api/admin/jobs` | 创建定时任务 | ✅ ADMIN |
| PATCH | `/api/admin/jobs/[id]` | 更新任务 | ✅ ADMIN |
| DELETE | `/api/admin/jobs/[id]` | 删除任务 | ✅ ADMIN |
| POST | `/api/admin/jobs/[id]/run` | 手动触发任务 | ✅ ADMIN |

---

## Audit & Attachments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/audit` | 审计日志（分页） | ✅ |
| GET | `/api/attachments/[id]` | 下载附件 | ✅ |
