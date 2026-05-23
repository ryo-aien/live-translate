PROJECT_ID  ?= $(shell gcloud config get-value project 2>/dev/null)
REGION      ?= asia-northeast1
IMAGE_TAG   ?= $(shell git rev-parse --short HEAD)
REPO        := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/voice-bridge/app

# プロジェクト新規作成する場合は以下を指定
# make bootstrap PROJECT_ID=... BILLING_ACCOUNT=... ORG_ID=...
BILLING_ACCOUNT ?=
ORG_ID          ?=
FOLDER_ID       ?=

.PHONY: help auth bootstrap init plan apply build push deploy secret

help:
	@echo "─── 初回セットアップ ────────────────────────────────────"
	@echo "  make auth                  gcloud 認証"
	@echo "  make bootstrap             プロジェクト作成 + インフラ構築 + シークレット登録"
	@echo ""
	@echo "─── デプロイ ────────────────────────────────────────────"
	@echo "  make deploy                イメージビルド → push → Cloud Run 更新"
	@echo ""
	@echo "─── 個別操作 ────────────────────────────────────────────"
	@echo "  make init                  terraform init"
	@echo "  make plan                  terraform plan"
	@echo "  make apply                 terraform apply"
	@echo "  make build                 Docker イメージをビルド"
	@echo "  make push                  ビルド + Artifact Registry へ push"
	@echo "  make secret                OPENAI_API_KEY を Secret Manager に登録"
	@echo ""
	@echo "Variables: PROJECT_ID=$(PROJECT_ID) REGION=$(REGION) IMAGE_TAG=$(IMAGE_TAG)"

# ── 認証 ───────────────────────────────────────────────────────────────────

auth:
	gcloud auth login
	gcloud auth application-default login
	  --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/accounts.reauth

# ── 初回セットアップ ────────────────────────────────────────────────────────

# 既存プロジェクト向け: make bootstrap PROJECT_ID=xxx
# 新規プロジェクト向け: make bootstrap PROJECT_ID=xxx BILLING_ACCOUNT=xxx ORG_ID=xxx
bootstrap: init
	@if [ -n "$(BILLING_ACCOUNT)" ]; then \
	  terraform -chdir=infra apply \
	    -var="project_id=$(PROJECT_ID)" \
	    -var="region=$(REGION)" \
	    -var="image_tag=$(IMAGE_TAG)" \
	    -var="create_project=true" \
	    -var="billing_account=$(BILLING_ACCOUNT)" \
	    $(if $(ORG_ID),-var="org_id=$(ORG_ID)",) \
	    $(if $(FOLDER_ID),-var="folder_id=$(FOLDER_ID)",) \
	    -auto-approve; \
	else \
	  terraform -chdir=infra apply \
	    -var="project_id=$(PROJECT_ID)" \
	    -var="region=$(REGION)" \
	    -var="image_tag=$(IMAGE_TAG)" \
	    -auto-approve; \
	fi
	@$(MAKE) secret PROJECT_ID=$(PROJECT_ID)
	@echo ""
	@echo "✓ セットアップ完了。次は make deploy でデプロイしてください。"

# ── Terraform ──────────────────────────────────────────────────────────────

init:
	terraform -chdir=infra init

plan:
	terraform -chdir=infra plan \
	  -var="project_id=$(PROJECT_ID)" \
	  -var="region=$(REGION)" \
	  -var="image_tag=$(IMAGE_TAG)"

apply:
	terraform -chdir=infra apply \
	  -var="project_id=$(PROJECT_ID)" \
	  -var="region=$(REGION)" \
	  -var="image_tag=$(IMAGE_TAG)"

# ── Docker ─────────────────────────────────────────────────────────────────

build:
	docker build --platform linux/amd64 --target production \
	  -t $(REPO):$(IMAGE_TAG) \
	  -t $(REPO):latest \
	  .

push: build
	gcloud auth configure-docker $(REGION)-docker.pkg.dev --quiet
	docker push $(REPO):$(IMAGE_TAG)
	docker push $(REPO):latest

# ── フルデプロイ ────────────────────────────────────────────────────────────

deploy: push apply
	@echo ""
	@echo "✓ $(IMAGE_TAG) をデプロイしました"
	@terraform -chdir=infra output -raw service_url

# ── シークレット登録 ────────────────────────────────────────────────────────

secret:
	@printf "OPENAI_API_KEY: " && read -rs key && echo && \
	  printf '%s' "$$key" | gcloud secrets versions add voice-bridge-openai-api-key \
	    --project=$(PROJECT_ID) \
	    --data-file=-
	@echo "✓ シークレットを登録しました"
