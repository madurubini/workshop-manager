output "host" {
  description = "Nome DNS do banco dentro do cluster."
  value       = kubernetes_service.banco.metadata[0].name
}

output "porta" {
  description = "Porta do Postgres."
  value       = 5432
}

output "secret_credenciais" {
  description = "Nome do Secret com as credenciais do Postgres."
  value       = kubernetes_secret.credenciais.metadata[0].name
}
