# Docker 一键部署到服务器

## 方式 A：代码已在服务器上（最简单）

```bash
# SSH 登录服务器后
cd /opt/campus-trade   # 你的项目目录

# 首次：改密钥（可选但建议）
nano .env.docker       # 修改 JWT_SECRET

# 一键部署
chmod +x deploy.sh
./deploy.sh
```

浏览器访问：`http://服务器公网IP:8080`  
演示账号：`demo` / `123456`

---

## 方式 B：本机一键推到服务器（Windows）

1. 服务器已装 Docker + docker-compose，并开通 22 端口 SSH  
2. 本机可 `ssh root@你的IP` 免密或密码登录  
3. 在项目根目录执行：

```powershell
.\deploy-to-server.ps1 -Server "root@你的服务器IP" -RemoteDir "/opt/campus-trade"
```

脚本会：打包代码 → scp 上传 → 服务器上 `docker-compose up -d --build`

---

## 方式 C：手动 scp + 远程构建

```bash
# 本机（Git Bash / WSL）
rsync -avz --exclude node_modules --exclude dist --exclude server/data \
  ./ root@服务器IP:/opt/campus-trade/

ssh root@服务器IP "cd /opt/campus-trade && chmod +x deploy.sh && ./deploy.sh"
```

---

## 服务器环境要求

| 项 | 说明 |
|----|------|
| 系统 | Linux（Ubuntu 20+/CentOS 7+ 等） |
| Docker | 20+ 推荐 |
| 端口 | 默认开放 **8080**（前端），可选 3000 |
| 内存 | 建议 ≥ 1GB（构建镜像时） |

### 安装 Docker（Ubuntu 示例）

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
# 旧版 compose 插件二选一
apt install -y docker-compose-plugin || apt install -y docker-compose
```

### 国内镜像拉不动时

配置 Docker 镜像加速（`/etc/docker/daemon.json`），例如：

```json
{
  "registry-mirrors": ["https://docker.1ms.run"]
}
```

```bash
systemctl restart docker
```

然后重新 `./deploy.sh`。

---

## 常用运维命令

```bash
# 查看状态
docker ps | grep campus

# 看日志
docker logs -f campus-server
docker logs -f campus-web

# 更新代码后重新部署
./deploy.sh

# 停止
docker-compose down

# 停止并清空数据（慎用）
docker-compose down -v
```

---

## 端口与域名

- 默认前端：`http://IP:8080`（Nginx 反代 `/api` 到后端）
- 改端口：编辑 `.env.docker` 里 `WEB_PORT=80` 后重新 `./deploy.sh`
- 绑定域名：在服务器 Nginx/Caddy 把 80/443 反代到 `127.0.0.1:8080`

---

## 生产注意

1. **务必修改** `.env.docker` 中的 `JWT_SECRET`
2. 数据在 Docker 卷 `server_data` / `uploads_data`，升级容器不会丢库
3. 防火墙放行：`ufw allow 8080/tcp` 或云厂商安全组放行 8080
