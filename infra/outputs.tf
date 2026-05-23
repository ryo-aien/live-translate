output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.app.uri
}

output "image_repository" {
  description = "Artifact Registry image repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/voice-bridge/app"
}

output "secret_name" {
  description = "Secret Manager secret name for OPENAI_API_KEY"
  value       = google_secret_manager_secret.openai_api_key.secret_id
}
