# 03 API 设计规范

## 基本原则

- RESTful 风格 + Next.js Route Handlers
- 统一响应格式
- Zod Schema 验证所有输入
- 版本前缀: `/api/v1/`（未来需要时）

## 统一响应格式

```typescript
// 成功
{
  "success": true,
  "data": { ... },
  "meta": {                    // 分页时
    "total": 3102,
    "page": 1,
    "pageSize": 20,
    "totalPages": 156
  }
}

// 失败
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "field": "title", "message": "Title is required" }
    ]
  }
}
```

## 错误码定义

| HTTP | Code | 说明 |
|---|---|---|
| 400 | VALIDATION_ERROR | 输入验证失败 |
| 401 | UNAUTHORIZED | 未认证 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 冲突（重复等） |
| 422 | BUSINESS_ERROR | 业务规则违反 |
| 429 | RATE_LIMITED | 请求过频 |
| 500 | INTERNAL_ERROR | 服务器错误 |

## API 端点清单

### 变更请求
```
GET    /api/change-requests              # 列表（支持过滤/排序/分页）
POST   /api/change-requests              # 创建
GET    /api/change-requests/:id          # 详情
PATCH  /api/change-requests/:id          # 更新
DELETE /api/change-requests/:id          # 删除（软删除）
POST   /api/change-requests/:id/submit   # 提交审批
POST   /api/change-requests/:id/cancel   # 取消
GET    /api/change-requests/:id/history  # 变更历史
POST   /api/change-requests/:id/comments # 添加评论
GET    /api/change-requests/:id/comments # 评论列表
POST   /api/change-requests/batch        # 批量操作
POST   /api/change-requests/export       # 导出Excel
```

### 审批
```
GET    /api/approvals                    # 我的待审批列表
POST   /api/approvals/:id/approve        # 批准
POST   /api/approvals/:id/reject         # 驳回
POST   /api/approvals/:id/return         # 退回
POST   /api/approvals/:id/delegate       # 委托
```

### Ingest (外部摄入)
```
POST   /api/ingest                       # 外部数据摄入（兼容现有）
  Header: X-API-Key: openassist-ingest-2026
```

### 数据标准
```
GET    /api/data-standards
POST   /api/data-standards
PATCH  /api/data-standards/:id
DELETE /api/data-standards/:id
```

### 数据质量
```
POST   /api/data-quality/check           # 执行数据质量检查
GET    /api/data-quality/results          # 检查结果
GET    /api/data-quality/rules            # 规则列表
POST   /api/data-quality/rules            # 创建规则
```

### Dashboard & 报表
```
GET    /api/stats                         # 总览统计（兼容现有）
GET    /api/stats/trends                  # 趋势数据
GET    /api/stats/categories              # 分类统计
GET    /api/stats/sla                     # SLA达标率
GET    /api/reports/:type                 # 预定义报表
```

### 用户管理 (Admin)
```
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
GET    /api/admin/roles
POST   /api/admin/roles
PATCH  /api/admin/roles/:id
GET    /api/admin/audit-logs
GET    /api/admin/system-config
PATCH  /api/admin/system-config/:key
```

### 通知
```
GET    /api/notifications                 # 我的通知
PATCH  /api/notifications/:id/read        # 标记已读
POST   /api/notifications/read-all        # 全部已读
```

### 系统集成
```
GET    /api/integrations                  # 集成配置列表
POST   /api/integrations/:id/test         # 测试连接
POST   /api/integrations/:id/sync         # 手动同步
GET    /api/integrations/:id/logs         # 同步日志
```

## 查询参数规范

```
# 分页
?page=1&pageSize=20

# 排序
?sort=requestedDate&order=desc

# 过滤
?status=SUBMITTED,PENDING_APPROVAL
?category=ITEM_MASTER
?requestorId=xxx
?dateFrom=2026-01-01&dateTo=2026-12-31

# 搜索
?search=keyword              # 全文搜索

# 字段选择（可选）
?fields=id,title,status
```

## 认证

- **页面访问:** NextAuth.js session cookie
- **API调用:** Bearer token 或 session cookie
- **外部Ingest:** `X-API-Key` header
- **Webhook:** HMAC签名验证
