terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Uncomment to store state in GCS (recommended for production)
  # backend "gcs" {
  #   bucket = "your-tfstate-bucket"
  #   prefix = "voice-bridge"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ── Project (optional) ────────────────────────────────────────────────────
# create_project = true のときのみ作成する

resource "google_project" "app" {
  count           = var.create_project ? 1 : 0
  name            = var.project_id
  project_id      = var.project_id
  org_id          = var.org_id != "" ? var.org_id : null
  folder_id       = var.folder_id != "" ? var.folder_id : null
  billing_account = var.billing_account
}

resource "google_billing_project_info" "app" {
  count           = var.create_project ? 1 : 0
  project         = var.project_id
  billing_account = var.billing_account
  depends_on      = [google_project.app]
}

# ── APIs ──────────────────────────────────────────────────────────────────

resource "google_project_service" "run" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secret_manager" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# ── Artifact Registry ─────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "app" {
  project       = var.project_id
  location      = var.region
  repository_id = "voice-bridge"
  format        = "DOCKER"
  depends_on    = [google_project_service.artifact_registry]
}

# ── Service Account ───────────────────────────────────────────────────────

resource "google_service_account" "cloudrun" {
  project      = var.project_id
  account_id   = "voice-bridge-run"
  display_name = "voice-bridge Cloud Run SA"
}

# ── Secret Manager ────────────────────────────────────────────────────────

resource "google_secret_manager_secret" "openai_api_key" {
  project   = var.project_id
  secret_id = "voice-bridge-openai-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_iam_member" "cloudrun_secret_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.openai_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun.email}"
}

# ── Cloud Run ─────────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "app" {
  project  = var.project_id
  name     = "voice-bridge"
  location = var.region

  template {
    service_account = google_service_account.cloudrun.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/voice-bridge/app:${var.image_tag}"

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openai_api_key.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_secret_manager_secret_iam_member.cloudrun_secret_access,
  ]
}

# 認証なしで公開
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  name     = google_cloud_run_v2_service.app.name
  location = google_cloud_run_v2_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
