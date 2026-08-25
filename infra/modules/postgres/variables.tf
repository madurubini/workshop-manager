variable "namespace" {
  description = "Namespace onde o banco é criado."
  type        = string
}

variable "nome" {
  description = "Nome do StatefulSet e do Service do banco."
  type        = string
  default     = "oficina-db"
}

variable "imagem" {
  description = "Imagem do Postgres."
  type        = string
  default     = "postgres:16-alpine"
}

variable "usuario" {
  description = "Usuário do Postgres."
  type        = string
}

variable "senha" {
  description = "Senha do Postgres."
  type        = string
  sensitive   = true
}

variable "banco" {
  description = "Nome do banco de dados criado na inicialização."
  type        = string
}

variable "tamanho_volume" {
  description = "Tamanho do volume persistente."
  type        = string
  default     = "1Gi"
}

variable "labels" {
  description = "Rótulos comuns herdados do módulo raiz."
  type        = map(string)
  default     = {}
}
