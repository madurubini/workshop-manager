variable "kubeconfig_path" {
  description = "Caminho do kubeconfig usado para falar com o cluster."
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Contexto do kubeconfig (o cluster alvo)."
  type        = string
  default     = "minikube"
}

variable "namespace" {
  description = "Namespace onde toda a aplicação é provisionada."
  type        = string
  default     = "oficina"
}

variable "banco_usuario" {
  description = "Usuário do Postgres."
  type        = string
  default     = "oficina"
}

variable "banco_senha" {
  description = "Senha do Postgres."
  type        = string
  sensitive   = true
  default     = "oficina"
}

variable "banco_nome" {
  description = "Nome do banco de dados da aplicação."
  type        = string
  default     = "oficina"
}

variable "banco_tamanho_volume" {
  description = "Tamanho do volume persistente do Postgres."
  type        = string
  default     = "1Gi"

  validation {
    condition     = can(regex("^[0-9]+(Mi|Gi)$", var.banco_tamanho_volume))
    error_message = "Use um tamanho no formato do Kubernetes, por exemplo 512Mi ou 1Gi."
  }
}

variable "banco_imagem" {
  description = "Imagem do Postgres."
  type        = string
  default     = "postgres:16-alpine"
}

variable "jwt_secret" {
  description = "Segredo usado para assinar os tokens JWT das rotas administrativas."
  type        = string
  sensitive   = true
  default     = "segredo-de-desenvolvimento-nao-use-em-producao"
}
