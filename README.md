# 校园二手交易系统

本地 Docker 一键部署的校园闲置交易平台（不依赖妙搭）。

## 功能

- 注册 / 登录（JWT）
- 商品发布、浏览、搜索、分类筛选
- 订单（想要 → 约定中 → 完成 / 取消）
- 站内私信
- 成交评价

## 方式一：本地直接跑（MySQL）

先准备本地 MySQL（127.0.0.1:3306）：

```sql
CREATE DATABASE IF NOT EXISTS campus_trade DEFAULT CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'campus'@'%' IDENTIFIED BY 'campus123';
GRANT ALL ON campus_trade.* TO 'campus'@'%';
FLUSH PRIVILEGES;
```

```bash
# 后端（读 server/.env，默认连 127.0.0.1 MySQL）
cd server
cp ../.env.example .env   # 按需改密码
npm install
npm run start:dev

# 新开终端：前端
cd web
npm install
npm run dev
```

- 前端：http://localhost:5173  
- API：http://localhost:3000/api  
- 首次启动自动建表 + 演示数据

## 方式二：Docker 一键部署（MySQL）

```bash
cp .env.docker.example .env.docker
# 编辑 .env.docker 填写 JWT / AI Key
docker compose up -d --build
```

| 服务 | 地址 |
|------|------|
| 前端 | http://服务器IP:8081 |
| 后端 API | http://服务器IP:3001/api |
| MySQL | 宿主机 `IP:3307` |

### MySQL 连接参数（Navicat / DBeaver）

| 项 | 值 |
|----|-----|
| Host | 服务器公网 IP 或 `127.0.0.1`（本机） |
| Port | `3307` |
| User | `campus` |
| Password | `campus123`（与 `.env.docker` 一致） |
| Database | `campus_trade` |
| Root 密码 | `root123456`（仅容器内 root） |

> 生产请修改 `DB_PASSWORD` / `MYSQL_ROOT_PASSWORD`，并限制 3307 安全组仅自己 IP 可访问。

## 演示账号（首次启动自动种子）

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 演示用户 | demo | 123456 |
| 管理员 | admin | admin123 |

## 目录

```
server/   NestJS API
web/      Vue3 前端
docker-compose.yml
```

## 停止

```bash
docker compose down
# 清数据：docker compose down -v
```
