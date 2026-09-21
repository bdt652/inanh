#!/usr/bin/env bash
# =====================================================================
# setup-cluster.sh — chạy TRÊN MÁY 108 (k8s-main) sau khi git pull.
#
# Việc làm:
#   1) Tạo namespace inanh24h (nếu chưa có)
#   2) Tạo ServiceAccount + ClusterRoleBinding cho CI (quyền deploy giới hạn)
#   3) Sinh kubeconfig riêng (CI-KUBECONFIG) -> in ra base64 để dán vào
#      GitHub Secret KUBE_CONFIG
#   4) Tạo Secret inanh24h-secrets từ biến môi trường (bạn điền)
#
# CÁCH DÙNG:
#   source /path/to/.env      # nạp MONGODB_URI, ADMIN_TOKEN_SECRET, ...
#   bash setup-cluster.sh
# =====================================================================
set -euo pipefail

NS=inanh24h
SA=github-actions-deployer

echo "==> 1. Namespace"
kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"

echo "==> 2. ServiceAccount + quyền deploy (chỉ trong namespace $NS)"
kubectl -n "$NS" create serviceaccount "$SA" --dry-run=client -o yaml | kubectl apply -f -
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: $NS
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["traefik.io", "cert-manager.io"]
    resources: ["ingressroutes", "middlewares", "certificates", "clusterissuers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list", "create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer-binding
  namespace: $NS
subjects:
  - kind: ServiceAccount
    name: $SA
    namespace: $NS
roleRef:
  kind: Role
  name: deployer
  apiGroup: rbac.authorization.k8s.io
EOF

echo "==> 3. Sinh CI kubeconfig"
# Lấy token của SA (k8s >= 1.24 dùng projected token)
kubectl -n "$NS" delete secret "$SA-token" --ignore-not-found
kubectl -n "$NS" apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: $SA-token
  namespace: $NS
  annotations:
    kubernetes.io/service-account.name: $SA
type: kubernetes.io/service-account-token
EOF
sleep 3
TOKEN=$(kubectl -n "$NS" get secret "$SA-token" -o jsonpath='{.data.token}' | base64 -d)
CA=$(kubectl -n "$NS" get secret "$SA-token" -o jsonpath='{.data.ca\.crt}')
# Lấy server endpoint từ kubeconfig hiện tại
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

cat > /tmp/ci-kubeconfig <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: inanh24h-cluster
    cluster:
      server: $SERVER
      certificate-authority-data: $CA
contexts:
  - name: ci
    context:
      cluster: inanh24h-cluster
      namespace: $NS
      user: ci
users:
  - name: ci
    user:
      token: $TOKEN
EOF

echo "----------------------------------------------------------------------"
echo "GitHub Secret KUBE_CONFIG (base64 của /tmp/ci-kubeconfig):"
echo "----------------------------------------------------------------------"
base64 -w0 /tmp/ci-kubeconfig
echo
echo

echo "==> 4. Tạo Secret inanh24h-secrets từ env hiện tại"
# Yêu cầu: bạn đã 'source .env' trước khi chạy script.
kubectl -n "$NS" create secret generic inanh24h-secrets \
  --from-literal=MONGODB_URI="${MONGODB_URI:-CHANGEME}" \
  --from-literal=ADMIN_TOKEN_SECRET="${ADMIN_TOKEN_SECRET:-CHANGEME}" \
  --from-literal=ADMIN_BOOTSTRAP_SECRET="${ADMIN_BOOTSTRAP_SECRET:-CHANGEME}" \
  --from-literal=CUSTOMER_TOKEN_SECRET="${CUSTOMER_TOKEN_SECRET:-CHANGEME}" \
  --from-literal=MINIO_ROOT_USER="${MINIO_ROOT_USER:-admin}" \
  --from-literal=MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-CHANGEME}" \
  --from-literal=AI_API_KEY="${AI_API_KEY:-CHANGEME}" \
  --from-literal=AI_BASE_URL="${AI_BASE_URL:-http://192.168.53.106:20128/v1}" \
  --from-literal=REVALIDATE_SECRET="${REVALIDATE_SECRET:-CHANGEME}" \
  --from-literal=SMS_PROVIDER_URL="${SMS_PROVIDER_URL:-}" \
  --from-literal=SMS_PROVIDER_TOKEN="${SMS_PROVIDER_TOKEN:-}" \
  --from-literal=SMS_SENDER_ID="${SMS_SENDER_ID:-}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> DONE. Kiểm tra:"
kubectl -n "$NS" get secret inanh24h-secrets -o name
