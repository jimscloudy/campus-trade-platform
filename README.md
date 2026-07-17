# 校园二手交易系统

本地 Docker 一键部署的校园闲置交易平台（不依赖妙搭）。

## 功能

- 注册 / 登录（JWT）
- 商品发布、浏览、搜索、分类筛选
- 订单（想要 → 约定中 → 完成 / 取消）
- 站内私信
- 成交评价

## 方式一：本地直接跑（推荐，无需 Docker 镜像）

```bash
# 后端（默认 SQLite，自动建库建表+演示数据）
cd server
npm install
npm run start:dev

# 新开终端：前端
cd web
npm install
npm run dev
```

- 前端：http://localhost:5173  
- API：http://localhost:3000/api  

## 方式二：Docker 一键部署

需能拉取 `node:20-alpine`、`nginx` 镜像：

```bash
docker-compose up -d --build
```

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:8080 |
| 后端 API | http://localhost:3000/api |

默认使用 SQLite 卷持久化；若要用 MySQL，设置 `DB_TYPE=mysql` 并自行加 MySQL 服务。

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
