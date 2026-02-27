# OpenAssist 快速启动指南

## 🚀 快速开始

### 方法1：使用启动脚本（推荐）
```bash
# Windows
start.bat

# 或手动执行
python run.py
```

### 方法2：使用虚拟环境
```bash
# 1. 创建虚拟环境
python -m venv venv

# 2. 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 运行应用
python run.py
```

### 方法3：直接运行（如果已安装依赖）
```bash
python run.py
```

## 📱 访问应用

启动成功后，在浏览器访问：
- **地址**: http://localhost:5001
- **Demo账号**: demo / demo

## 💡 主要功能

### 1. 登录
- 使用Demo账号登录（demo/demo）
- 或使用IWMS SSO认证（需要内网环境）

### 2. 仪表盘
- 查看请求统计（待审批、已审批、已拒绝）
- 查看最近的变更请求

### 3. AI文档解析
- 粘贴物料维护请求文档
- 点击"开始解析"让AI自动提取变更信息
- 可点击"加载示例"查看示例格式

### 4. 变更请求管理
- 查看所有变更请求
- 按状态筛选（待审批/已审批/已拒绝）
- 点击"查看"可查看详情并进行审批

### 5. 物料数据查询
- 输入物料号查询EBS和PLM数据
- 对比变更前后的值

### 6. 字段词典管理
- 维护业务描述到系统字段的映射
- 增删改查字典项
- AI解析时会引用此词典

## 🔧 配置说明

### 环境变量（可选）
复制 `.env.example` 为 `.env` 并修改：

```env
FLASK_ENV=development
DB_ENV=DEV

# AI配置（可选，不配置则使用规则解析）
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
AI_MODEL=gpt-4
```

### 数据库配置
- 默认使用DEV环境数据库
- 如果数据库不可用，会自动返回Mock数据
- 修改 `app/config.py` 可切换到PRD环境

## 📝 示例数据

项目自带示例数据：
- **字典数据**: `app/data/field_dictionary.json`
- **变更请求**: `app/data/change_requests.json`
- **示例文档**: `app/data/sample_requests/sample1.txt`

## 🧪 测试

运行基础测试：
```bash
python tests/test_basic.py
```

## ⚠️ 注意事项

1. **端口冲突**: 默认端口5001，如有冲突可在 `run.py` 中修改
2. **Oracle数据库**: 需要安装cx_Oracle，如连接失败会自动使用Mock数据
3. **IWMS认证**: 需要内网环境，否则使用Demo模式（demo/demo）
4. **AI解析**: 未配置API Key时会使用规则解析（Demo模式）

## 📚 API文档

查看 `README.md` 中的完整API接口列表。

## 🛠️ 故障排除

### 问题1: 依赖安装失败
```bash
# 升级pip
python -m pip install --upgrade pip

# 重新安装
pip install -r requirements.txt
```

### 问题2: cx_Oracle安装失败
- Windows: 需要安装Oracle Instant Client
- 或者暂时从requirements.txt中移除cx_Oracle（会使用Mock数据）

### 问题3: 端口被占用
修改 `run.py` 中的端口号：
```python
app.run(host='0.0.0.0', port=5002, debug=True)
```

### 问题4: CORS错误
已配置CORS，如仍有问题检查浏览器控制台错误信息。

## 📧 技术支持

如有问题，请检查：
1. Python版本（建议3.8+）
2. 依赖是否完整安装
3. 浏览器控制台是否有错误
4. Flask日志输出

---

**祝使用愉快！** 🎉
