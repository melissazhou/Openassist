# OpenAssist — 部署与迁移指南

## 目录

1. [环境要求](#1-环境要求)
2. [新服务器部署（从零开始）](#2-新服务器部署)
3. [数据库初始化](#3-数据库初始化)
4. [环境变量配置](#4-环境变量配置)
5. [构建与启动](#5-构建与启动)
6. [反向代理配置（Nginx）](#6-反向代理配置)
7. [进程管理（PM2）](#7-进程管理)
8. [从现有环境迁移](#8-从现有环境迁移)
9. [数据库备份与恢复](#9-数据库备份与恢复)
10. [常见问题](#10-常见问题)

---

## 1. 环境要求

| 组件 | 最低版本 | 推荐 |
|------|---------|------|
| Node.js | 20.x | 22.x LTS |
| pnpm | 9.x | 10.x |
| PostgreSQL | 15 | 16 |
| 操作系统 | Ubuntu 22.04 / Windows Server 2022 | Ubuntu 24.04 |
| Ram | 4 GB | 6 GB |
| Disk | 100 GB | 200 GB |

**可选依赖：**
- Oracle Instant Client 21+ — 仅当需要 Item Master (EBS) 查询时
- Docker — 用于数据库容器化部署
- Nginx — 反向代理

---

## 2. 新服务器部署

### 2.1 Linux (Ubuntu/Debian)

```bash
# ── 系统依赖 ──
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential

# ── Node.js (via nvm) ──
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# ── pnpm ──
corepack enable
corepack prepare pnpm@latest --activate

# ── PostgreSQL ──
# 方式A: Docker（推荐）
docker run -d --name openassist-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=openassist \
  -e POSTGRES_PASSWORD=<STRONG_PASSWORD> \
  -e POSTGRES_DB=openassist \
  -p 5432:5432 \
  -v openassist-pgdata:/var/lib/postgresql/data \
  postgres:16

# 方式B: 系统安装
sudo apt install -y postgresql-16
sudo -u postgres createuser --pwprompt openassist
sudo -u postgres createdb -O openassist openassist
```

### 2.2 Windows Server

```powershell
# ── Node.js ──
# 下载安装 https://nodejs.org/en/download (LTS)

# ── pnpm ──
corepack enable
corepack prepare pnpm@latest --activate

# ── PostgreSQL ──
# 下载安装 https://www.postgresql.org/download/windows/
# 或使用 Docker Desktop:
docker run -d --name openassist-postgres `
  --restart unless-stopped `
  -e POSTGRES_USER=openassist `
  -e POSTGRES_PASSWORD=<STRONG_PASSWORD> `
  -e POSTGRES_DB=openassist `
  -p 5432:5432 `
  -v openassist-pgdata:/var/lib/postgresql/data `
  postgres:16
```

### 2.3 获取代码

```bash
git clone <repo-url> /opt/openassist
cd /opt/openassist
pnpm install --frozen-lockfile
```

---

## 3. 数据库初始化

```bash
# 应用所有迁移（创建表结构）
pnpm prisma migrate deploy

# 种子数据（创建默认用户 + 系统配置）
pnpm prisma db seed
```

**迁移历史：**

| 迁移 | 说明 |
|------|------|
| `20260227034415_init` | 基础表: users, accounts, sessions, change_requests, approvals, comments, attachments, audit_logs |
| `20260227044346_enrich_mdm_fields` | MDM字段扩充: mdmField, orgs[], itemCodes[], risk, sourceStatus等 |
| `20260227053415_add_system_config_jobs` | 系统配置表 + 定时任务表 |
| `20260227141727_add_notifications` | 通知系统表 |

---

## 4. 环境变量配置

创建 `.env` 文件（**不要提交到Git**）：

```bash
# ── 数据库 ──
DATABASE_URL="postgresql://openassist:<PASSWORD>@localhost:5432/openassist?schema=public"

# ── NextAuth ──
NEXTAUTH_SECRET="<生成: openssl rand -base64 32>"
NEXTAUTH_URL="https://your-domain.com"

# ── Ingest API ──
INGEST_API_KEY="<自定义API密钥>"

# ── Oracle EBS（可选，需要VPN/网络连通） ──
EBS_USER="Xxapps_ro"
EBS_PASSWORD="<password>"
EBS_CONNECT="<host>:<port>/<service>"

# ── IWMS WMS（可选） ──
WMS_USER="xxwms_ro"
WMS_PASSWORD="<password>"
WMS_CONNECT="<host>:<port>/<service>"
```

**关键说明：**
- `NEXTAUTH_SECRET` 生产环境必须替换为随机强密钥
- `NEXTAUTH_URL` 必须设为实际访问域名（影响cookie和回调URL）
- Oracle连接需要安装 Oracle Instant Client 并设置 `LD_LIBRARY_PATH`

---

## 5. 构建与启动

### 生产构建

```bash
pnpm build       # 产出: .next/
pnpm start       # 默认端口 3000
```

### 自定义端口

```bash
PORT=8080 pnpm start
# 或
next start -p 8080
```

---

## 6. 反向代理配置

### Nginx

```nginx
server {
    listen 80;
    server_name mdm.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mdm.your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/mdm.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mdm.your-domain.com/privkey.pem;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 文件上传限制
        client_max_body_size 50M;
    }
}
```

### IIS (Windows)

使用 URL Rewrite + Application Request Routing (ARR) 配置反向代理到 `http://localhost:3000`。

---

## 7. 进程管理

### PM2 (推荐, Linux)

```bash
npm install -g pm2

# 启动
pm2 start npm --name "openassist" -- start
pm2 save
pm2 startup  # 开机自启

# 常用命令
pm2 status
pm2 logs openassist
pm2 restart openassist
pm2 stop openassist
```

### Windows Service

使用 [node-windows](https://github.com/coreybutler/node-windows) 或 NSSM：

```powershell
# NSSM 方式
nssm install OpenAssist "C:\Program Files\nodejs\node.exe"
nssm set OpenAssist AppDirectory "D:\Project\OpenAssist"
nssm set OpenAssist AppParameters "node_modules\.bin\next start"
nssm set OpenAssist AppEnvironmentExtra "PORT=3000" "NODE_ENV=production"
nssm start OpenAssist
```

---

## 8. 从现有环境迁移

### 8.1 完整迁移步骤

```bash
# ── 在旧服务器 ──

# 1. 导出数据库
pg_dump -h localhost -U openassist -d openassist -F c -f openassist_backup.dump

# 2. 导出上传文件（如有）
tar czf attachments.tar.gz uploads/

# 3. 复制 .env 配置（注意修改数据库地址）
cp .env .env.backup

# ── 在新服务器 ──

# 4. 部署代码（按第2-5节）
git clone <repo> /opt/openassist
cd /opt/openassist
pnpm install --frozen-lockfile

# 5. 恢复数据库
pg_restore -h localhost -U openassist -d openassist -c openassist_backup.dump

# 6. 恢复上传文件
tar xzf attachments.tar.gz -C /opt/openassist/

# 7. 验证迁移
pnpm prisma migrate status   # 确认所有迁移已应用
pnpm prisma db pull          # 可选：对比schema

# 8. 配置环境变量并启动
cp .env.backup .env          # 修改 DATABASE_URL, NEXTAUTH_URL 等
pnpm build
pnpm start
```

### 8.2 仅数据库迁移

如果代码已部署，只需迁移数据：

```bash
# 旧服务器导出
pg_dump -h OLD_HOST -U openassist -d openassist --data-only -F c -f data_only.dump

# 新服务器先初始化结构
pnpm prisma migrate deploy

# 恢复数据
pg_restore -h localhost -U openassist -d openassist --data-only data_only.dump
```

### 8.3 从Flask版本迁移

如果还在运行Flask legacy版本：

```bash
# Flask版的数据存储在 flask-legacy/app/data/change_requests.json
# 使用内置迁移API导入：
curl -X POST http://localhost:3000/api/mdm/ingest \
  -H "x-api-key: <INGEST_API_KEY>" \
  -H "Content-Type: application/json" \
  -d @flask-legacy/app/data/change_requests.json
```

---

## 9. 数据库备份与恢复

### 自动备份脚本 (cron)

```bash
#!/bin/bash
# /opt/openassist/scripts/backup.sh
BACKUP_DIR="/opt/openassist/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U openassist -d openassist -F c \
  -f "$BACKUP_DIR/openassist_$TIMESTAMP.dump"

# 保留最近30天
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete

echo "Backup completed: openassist_$TIMESTAMP.dump"
```

```bash
# 加入crontab (每日凌晨2点)
echo "0 2 * * * /opt/openassist/scripts/backup.sh >> /var/log/openassist-backup.log 2>&1" | crontab -
```

### 恢复

```bash
pg_restore -h localhost -U openassist -d openassist -c <backup_file>.dump
```

---

## 10. 常见问题

### Prisma DLL锁 (Windows)

**症状：** `EPERM: operation not permitted, rename query_engine-windows.dll.node`

**解决：** 停止dev server后再运行 `prisma generate` 或 `prisma migrate`。

### Oracle连接失败

**原因：** 需要Oracle Instant Client + VPN连通企业网络。

```bash
# Linux: 安装Instant Client
sudo apt install libaio1
# 下载 https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html
export LD_LIBRARY_PATH=/opt/oracle/instantclient_21_0
```

### NextAuth回调URL错误

**原因：** `NEXTAUTH_URL` 与实际访问地址不匹配。

**解决：** 确保 `.env` 中 `NEXTAUTH_URL` 为浏览器实际访问的URL（包含协议和端口）。

### Docker PostgreSQL数据持久化

**确认数据卷存在：**
```bash
docker volume inspect openassist-pgdata
```

### 生产环境安全清单

- [ ] `NEXTAUTH_SECRET` 使用随机强密钥（非默认值）
- [ ] PostgreSQL密码更换（非 `openassist2026`）
- [ ] 启用HTTPS (TLS/SSL)
- [ ] 配置防火墙（仅暴露80/443）
- [ ] 默认admin密码已修改
- [ ] `.env` 文件权限限制 (`chmod 600`)
- [ ] 数据库自动备份已配置
- [ ] 日志监控已配置
