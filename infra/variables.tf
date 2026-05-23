variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud region"
  type        = string
  default     = "asia-northeast1"
}

variable "image_tag" {
  description = "Docker image tag to deploy (e.g. git short SHA)"
  type        = string
  default     = "latest"
}

# ── Project creation (optional) ───────────────────────────────────────────

variable "create_project" {
  description = "true にすると GCP プロジェクトを新規作成する"
  type        = bool
  default     = false
}

variable "billing_account" {
  description = "請求先アカウント ID (create_project = true のとき必須)"
  type        = string
  default     = ""
}

variable "org_id" {
  description = "組織 ID (create_project = true かつ組織配下に作る場合)"
  type        = string
  default     = ""
}

variable "folder_id" {
  description = "フォルダ ID (create_project = true かつフォルダ配下に作る場合)"
  type        = string
  default     = ""
}

# ── Cloud Run ─────────────────────────────────────────────────────────────

variable "max_instances" {
  description = "Cloud Run の最大インスタンス数"
  type        = number
  default     = 3
}

variable "cpu" {
  description = "インスタンスあたりの CPU 上限"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "インスタンスあたりのメモリ上限"
  type        = string
  default     = "512Mi"
}
