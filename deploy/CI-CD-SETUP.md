# Thiết lập CI/CD (GitHub Actions → k3s máy 108)

Pipeline: `push main` → pytest → build+push image Docker Hub private → `kubectl apply` lên cluster.

## 1. Trên máy 108 (k8s-main) — chạy một lần

```bash
cd /opt/inanh
git pull
bash deploy/setup-cluster.sh
```

Script sẽ:
- Tạo namespace `inanh24h`
- Tạo ServiceAccount `github-actions-deployer` + Role giới hạn quyền deploy
- Sinh `/tmp/ci-kubeconfig` và **in ra chuỗi base64** → dùng cho GitHub Secret `KUBE_CONFIG`
- Đọc biến từ `.env` (phải `source .env` trước) để tạo Secret `inanh24h-secrets`

> LUU Y: `deploy/setup-cluster.sh` yêu cầu bạn đã `source /opt/inanh/.env` (hoặc export các biến)
> trước khi chạy, nếu không secret sẽ chứa giá trị `CHANGEME`.

### Neu chua cai Traefik / cert-manager (bat buoc cho Ingress TLS)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

helm repo add traefik https://traefik.github.io/charts
helm repo update
helm install traefik traefik/traefik -n traefik --create-namespace \
  --set ports.web.hostPort=80 --set ports.websecure.hostPort=443 \
  --set service.type=ClusterIP --set hostNetwork=true \
  --set securityContext.seccompProfile.type=RuntimeDefault
```

Kiem tra: `curl -I http://192.168.53.108` → Traefik 404.

## 2. DNS

Tro 2 A record → IP node `192.168.53.108`:
- `inanh24h.com`
- `api.inanh24h.com`

## 3. Trên GitHub — repo bdt652/inanh → Settings → Secrets and variables → Actions

**Repository Secrets:**
| Name | Value |
|------|-------|
| `DOCKERHUB_USERNAME` | ten user Docker Hub (vd: bdt652) |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token (khong dung password) |
| `KUBE_CONFIG` | chuoi base64 in ra tu setup-cluster.sh (buoc 1) |

**Repository Variables (tuy chon — co default san trong workflow):**
| Name | Default |
|------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.inanh24h.com/api/v1` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.inanh24h.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://inanh24h.com` |
| `NEXT_PUBLIC_UPLOAD_MODE` | `presigned` |
| `NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL` | `https://media.inanh24h.com/inanh24h-media` |
| `API_INTERNAL_URL` | `http://api:8000/api/v1` |

## 4. Kiem tra lan dau (truoc khi CI tu chay)

```bash
kubectl apply -f deploy/k8s/00-namespace.yaml
kubectl apply -f deploy/k8s/02-configmap-api.yaml deploy/k8s/03-configmap-web.yaml
kubectl apply -f deploy/k8s/10-api-deployment.yaml deploy/k8s/11-api-service.yaml
kubectl apply -f deploy/k8s/20-web-deployment.yaml deploy/k8s/21-web-service.yaml
kubectl apply -f deploy/k8s/30-cert-issuer.yaml deploy/k8s/31-ingress-api.yaml deploy/k8s/32-ingress-web.yaml
kubectl -n inanh24h get pods
```

## 5. Luu y bao mat

- `01-secrets.yaml` CO CHUA PLACEHOLDER `CHANGEME` → bi KHONG commit secret that, va CI KHONG apply file nay.
- Secret that duoc tao thu cong qua `setup-cluster.sh` (hoac `kubectl create secret`).
- Image Docker Hub de PRIVATE de nguoi khac khong lay duoc source tu layer.
- `deploy/setup-cluster.sh` tao ServiceAccount rieng (khong dung admin kubeconfig) → quyen gioi han.

## 6. Luu y Let's Encrypt

`30-cert-issuer.yaml` dang dung STAGING (tranh rate-limit). Khi moi thu on dinh, sua:
```
server: https://acme-v02.api.letsencrypt.org/directory
```
va xoa Certificate cu de cap lai:
```
kubectl -n inanh24h delete certificate api-inanh24h-tls inanh24h-tls
kubectl apply -f deploy/k8s/30-cert-issuer.yaml deploy/k8s/31-ingress-api.yaml deploy/k8s/32-ingress-web.yaml
```
