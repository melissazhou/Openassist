# Changelog

## v1.0.0 (2026-02-27)

### Phase 1-5: 核心功能

- **17个页面:** Dashboard, Change Requests (列表/详情/看板), Item Master, Analytics, Reports, Approvals, Data Dictionary, Audit Log, Admin (Config/Health/Jobs), Settings, Help
- **27+ API端点:** 完整CRUD + 审批工作流 + 报表 + 导入导出
- **13个数据库模型:** 含变更请求、审批、评论、附件、审计日志、系统配置、定时任务
- **3102条数据迁移:** 从Flask legacy版本JSON迁移

### Sprint 1: UI基础升级

- Dark Mode (next-themes, System/Light/Dark)
- 8个新shadcn/ui组件 (avatar, breadcrumb, alert, switch, progress, popover, pagination, scroll-area)
- Breadcrumb面包屑导航 (所有dashboard子页面)
- Avatar用户头像 (Header)
- Switch替代Button (配置页boolean值)
- Progress进度条 (健康检查内存使用率)
- Pagination标准化 (shadcn/ui组件)

### Sprint 2: 通知系统

- Notification数据模型 (6种通知类型)
- 通知API (GET/PATCH /api/notifications)
- Header铃铛通知面板 (Popover, 30s自动刷新)
- 自动通知触发: 状态变更、分配变更、审批结果、新评论
- 个人设置页: Profile (密码修改) + Preferences (主题/通知偏好)
- 密码修改API (PATCH /api/users/me/password)

### Sprint 3: TanStack Table升级

- @tanstack/react-table集成 (v8.21.3)
- 列排序 (7列可排序)
- 列可见性切换 (Columns下拉菜单)
- 行选择 (checkbox多选 + 全选)
- 批量操作: 批量设置状态、批量删除
- 行内快捷操作: View Details / Approve / Reject
- Dark Mode Badge颜色适配

### Sprint 4: 细节打磨

- Activity Timeline (详情页, 图标区分操作类型)
- 全局Loading Bar (路由切换动画)
- 侧边栏Collapsible分组 (MDM/Reports/Admin, 折叠时活跃指示)
- 空状态优化 (Search图标 + 引导文字)

### 技术债修复

- middleware.ts → proxy.ts迁移 (消除Next.js 16废弃警告)
- Zod验证补全 (6个新schema: comment, approval, user CRUD, password, config)
- Error Boundary (React class组件 + Next.js error.tsx/not-found.tsx)

---

## Pre-v1.0 (Flask Legacy)

- Flask + Jinja2模板
- 文件JSON存储 (change_requests.json)
- 基本CRUD + SharePoint数据抓取
- 已归档至 `flask-legacy/`
