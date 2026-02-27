@echo off
echo ========================================
echo OpenAssist - AI辅助业务流程平台
echo ========================================
echo.

REM 检查虚拟环境
if not exist venv (
    echo 创建虚拟环境...
    python -m venv venv
    echo.
)

REM 激活虚拟环境
echo 激活虚拟环境...
call venv\Scripts\activate.bat
echo.

REM 安装依赖（如果需要）
if not exist venv\Lib\site-packages\flask (
    echo 安装依赖包...
    pip install -r requirements.txt
    echo.
)

REM 启动应用
echo 启动OpenAssist...
echo 访问: http://localhost:5001
echo Demo账号: demo / demo
echo.
python run.py

pause
