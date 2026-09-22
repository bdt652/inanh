# Thiết lập CI/CD (GitHub Actions self-hosted runner → k3s máy 108)

Pipeline: `push main` → pytest → build+push image Docker Hub private → self-hosted
runner trên máy 108 gọi `deploy-inanh24h` để `kubectl` deploy.

## Ưu điểm của thiết kế này
- Không cần đưa kubeconfig/admin token ra ngoài GitHub (runner chạy ngay trên cluster).
- Runner đã có kubectl + context → deploy trực tiếp.

## 1. Trên máy 108 — chạy MỘT LẦN (chuẩn bị)

### 1a. Tạo namespace + secret thật
```bash
cd /opt/inanh
git pull
source .env                # nạp MONGODB_URI, ADMIN_TOKEN_SECRET, ...
bash deploy/setup-cluster.sh
```
Script tạo namespace `inanh24h`, Secret `inanh24h-secrets` từ `.env`.
(ServiceAccount trong script không còn bắt buộc vì dùng self-hosted runner,
nhưng vô hại — có thể bỏ qua phần kubeconfig base64.)

### 1b. Ingress (đã có sẵn — KHÔNG cài thêm)
Máy 108 dùng **kubeadm + ingress-nginx + cert-manager** (đã chạy). KHÔNG cài Traefik.
Public vào qua **Cloudflare Tunnel trên máy 100** → NodePort `30721` (web) / `31749` (api) → ingress-nginx.
Manifest `31/32` dùng chuẩn `Ingress` + `ingressClassName: nginx` + TLS qua cert-manager.

Kiểm tra stack hiện tại:
```bash
kubectl get pods -n ingress-nginx
kubectl get pods -n cert-manager
kubectl get ingressclass    # phải có: nginx
```

### 1c. Đặt script deploy + quyền sudo NOPASSWD
```bash
sudo cp /opt/inanh/deploy/deploy-inanh24h /usr/local/sbin/deploy-inanh24h
sudo chmod 755 /usr/local/sbin/deploy-inanh24h
# Cho phép runner gọi script không cần password:
echo "runneruser ALL=(ALL) NOPASSWD: /usr/local/sbin/deploy-inanh24h" | sudo tee /etc/sudoers.d/deploy-inanh24h
```

## 2. Đăng ký self-hosted runner trên máy 108
GitHub repo → Settings → Actions → Runners → New self-hosted runner (Linux x64).
Làm theo hướng dẫn: chạy lệnh `./config.sh` với `--labels inanh24h` và
`./run.sh` (hoặc cài systemd service để tự chạy). Runner phải có label `inanh24h`
(khớp với `runs-on` trong workflow).

Runner cần: `docker`, `kubectl` (context mặc định trỏ cluster), và có quyền
sudo gọi `deploy-inanh24h`.

## 3. GitHub Secrets
| Name | Value |
|------|-------|
| `DOCKERHUB_USERNAME` | `bdt652` |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token |

(Không cần `KUBE_CONFIG` vì runner chạy trên cluster.)

## 4. DNS / Public access
KHÔNG đổi DNS. Public vào cluster qua Cloudflare Tunnel trên máy 100
→ NodePort `30721` (web) / `31749` (api) → ingress-nginx.
Đảm bảo Cloudflare Tunnel đang chạy và trỏ đúng 2 NodePort này.

## 5. Test
Push 1 commit lên `main` → tab Actions: job test (pytest) → build (push image) →
deploy (runner gọi deploy-inanh24h). Kiểm tra:
```bash
kubectl -n inanh24h get pods
curl -I https://api.inanh24h.com/health
curl -I https://inanh24h.com/
```

## Lưu ý Let's Encrypt
`30-cert-issuer.yaml` đang dùng STAGING. Khi ổn định, đổi thành production:
`server: https://acme-v02.api.letsencrypt.org/directory` và xóa Certificate cũ để cấp lại.
