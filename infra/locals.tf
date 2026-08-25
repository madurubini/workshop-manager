locals {
  labels_comuns = {
    "app.kubernetes.io/part-of"    = "workshop-manager"
    "app.kubernetes.io/managed-by" = "terraform"
  }

  banco_host = "oficina-db"

  # Montada aqui para que a senha não apareça em arquivo versionado.
  database_url = "postgresql://${var.banco_usuario}:${var.banco_senha}@${local.banco_host}:5432/${var.banco_nome}?schema=public"
}
