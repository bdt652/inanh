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

Job deploy checkout đúng `github.sha`, rồi chạy `deploy/sync-manifests.sh` để
đồng bộ các manifest không chứa secret vào `/opt/inanh/deploy/k8s` trước khi
gọi script deploy đã cài. Runner cần quyền ghi vào thư mục này và các manifest
không chứa secret bên trong; quản trị viên cấp quyền theo tài khoản runner thực tế.
Không cấp thêm quyền sudo, không đổi quyền `.env` hoặc `01-secrets.yaml`.
Nếu thiếu quyền, gặp symlink, hoặc có manifest YAML ngoài commit chưa được
cho phép, pipeline dừng. `01-secrets.yaml` luôn bị bỏ qua, không bị đọc hay ghi
bởi bước đồng bộ.

Ngoại lệ chính xác: `40-nginx-ingress.yaml` là file chỉ có trên server đã được
ghi nhận trong log deploy. Bước đồng bộ giữ nguyên file thường này (kể cả quyền
read-only), không đọc, ghi đè, xóa hoặc tự tạo nội dung thay thế. Nếu checkout
đưa vào file cùng tên thì pipeline dừng để tránh giành quyền quản lý cấu hình.
Script deploy đã cài vẫn áp dụng các YAML như trước; ngoại lệ này không xác nhận
nội dung ingress đúng và không thay đổi cách script đó áp dụng file trên server.

Kiểm thử riêng bước đồng bộ (không cần cluster hoặc biến môi trường API):
`python3 -m unittest discover -s deploy/tests -v`.

Sau khi chuyển subnet, cần kiểm tra riêng origin của Cloudflare Tunnel cho
`media.inanh24h.com` trên máy chạy tunnel. MinIO trong cấu hình hiện tại là
`http://192.168.110.105:9000`; cấu hình tunnel không nằm trong repository này.
Push/deploy thành công không chứng minh đường media đã hoạt động; cần kiểm tra
`https://media.inanh24h.com/minio/health/live` và một URL ảnh đang tồn tại.

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
