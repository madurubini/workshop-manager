output "namespace" {
  description = "Namespace provisionado."
  value       = kubernetes_namespace.oficina.metadata[0].name
}

output "banco_host" {
  description = "Nome DNS do Postgres dentro do cluster."
  value       = module.postgres.host
}

output "secret_aplicacao" {
  description = "Secret consumido pelo Deployment da API."
  value       = kubernetes_secret.aplicacao.metadata[0].name
}

output "database_url" {
  description = "String de conexão da aplicação. Para ver: terraform output -raw database_url"
  value       = local.database_url
  sensitive   = true
}

output "proximo_passo" {
  description = "O que rodar depois deste apply."
  value       = "kubectl apply -f ../k8s/ -n ${kubernetes_namespace.oficina.metadata[0].name}"
}
