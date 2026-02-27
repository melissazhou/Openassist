# OpenAssist 部署说明

## 📋 前置要求

### 必需
- Python 3.8 或更高版本
- pip（Python包管理器）

### 可选
- Oracle Instant Client（如果需要连接真实Oracle数据库）
- OpenAI或Claude API Key（如果需要真实AI解析）

## 🚀 部署步骤

### 步骤1: 安装Python依赖

```bash
cd D:\Project\OpenAssist

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 步骤2: 配置环境（可选）

如需自定义配置，复制 `.env.example` 为 `.env` 并修改：

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
DB_ENV=DEV

# AI配置（可选）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=gpt-4
```

### 步骤3: 启动应用

#### 方法A: 使用启动脚本
```bash
# Windows
start.bat

# Linux/Mac
chmod +x run.py
python run.py
```

#### 方法B: 直接运行
```bash
python run.py
```

### 步骤4: 访问应用

在浏览器中打开：
```
http://localhost:5001
```

使用Demo账号登录：
- 用户名: `demo`
- 密码: `demo`

## 🔧 故障排除

### 问题1: cx_Oracle安装失败

**方案A**: 安装Oracle Instant Client
1. 下载: https://www.oracle.com/database/technologies/instant-client/downloads.html
2. 解压到某个目录（如 `C:\oracle\instantclient_19_8`）
3. 添加到系统PATH
4. 重新安装: `pip install cx_Oracle`

**方案B**: 临时移除Oracle依赖
```bash
# 编辑 requirements.txt，删除或注释这行：
# cx_Oracle==8.3.0

# 然后重新安装
pip install -r requirements.txt
```

注意：移除后会使用Mock数据，不影响Demo演示。

### 问题2: 端口5001被占用

修改 `run.py` 中的端口：
```python
app.run(host='0.0.0.0', port=5002, debug=True)
```

### 问题3: Flask导入错误

确保在项目根目录运行：
```bash
cd D:\Project\OpenAssist
python run.py
```

### 问题4: 模块未找到

重新安装依赖：
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 问题5: IWMS认证失败

这是正常的（需要内网环境），应用会自动降级到Demo模式：
- 用户名: `demo`
- 密码: `demo`

## 🌐 生产部署

### 使用Gunicorn（Linux）

```bash
# 安装Gunicorn
pip install gunicorn

# 启动应用
gunicorn -w 4 -b 0.0.0.0:5001 run:app
```

### 使用Waitress（Windows）

```bash
# 安装Waitress
pip install waitress

# 启动应用
waitress-serve --host=0.0.0.0 --port=5001 run:app
```

### Nginx反向代理

```nginx
server {
    listen 80;
    server_name openassist.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🔒 安全建议

### 生产环境配置

1. **修改SECRET_KEY**:
   ```env
   SECRET_KEY=生成一个强随机字符串
   ```

2. **关闭DEBUG模式**:
   ```env
   FLASK_ENV=production
   ```

3. **使用HTTPS**:
   - 配置SSL证书
   - 强制HTTPS跳转

4. **数据库安全**:
   - 使用只读账号
   - 限制数据库访问IP

5. **API Key安全**:
   - 不要将API Key提交到Git
   - 使用环境变量或密钥管理服务

## 📊 性能优化

### 1. 启用缓存
```python
from flask_caching import Cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})
```

### 2. 数据库连接池
已配置Oracle连接池（min=2, max=10）

### 3. 静态文件CDN
生产环境建议使用CDN托管静态文件

### 4. Gzip压缩
```python
from flask_compress import Compress
Compress(app)
```

## 🧪 测试

运行单元测试：
```bash
python tests/test_basic.py
```

运行覆盖率测试：
```bash
pip install pytest pytest-cov
pytest --cov=app tests/
```

## 📝 日志

日志输出到控制台，生产环境建议配置文件日志：

```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('openassist.log'),
        logging.StreamHandler()
    ]
)
```

## 🔄 更新部署

1. 备份数据文件：
   ```bash
   cp -r app/data app/data.backup
   ```

2. 拉取最新代码：
   ```bash
   git pull
   ```

3. 更新依赖：
   ```bash
   pip install -r requirements.txt --upgrade
   ```

4. 重启应用

## 📞 技术支持

遇到问题？检查：
1. Python版本 (`python --version`)
2. 依赖是否完整安装 (`pip list`)
3. 日志输出
4. 浏览器控制台错误

---

**部署成功！** 🎉
