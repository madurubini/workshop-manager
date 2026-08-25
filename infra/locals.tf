# Locals são valores calculados uma vez e reaproveitados — evitam repetir a
# mesma expressão em vários recursos.
locals {
  # Rótulos aplicados a tudo que este código cria. Permitem, por exemplo,
  # `kubectl get all -l app.kubernetes.io/part-of=workshop-manager`.
  labels_comuns = {
    "app.kubernetes.io/part-of"    = "workshop-manager"
    "app.kubernetes.io/managed-by" = "terraform"
  }

  # Nome do Service do banco — vira o hostname dentro do cluster, graças ao
  # DNS interno do Kubernetes.
  banco_host = "oficina-db"

  # String de conexão montada a partir das variáveis. É esta que a API recebe
  # pelo Secret; a senha nunca aparece em arquivo versionado.
  database_url = "postgresql://${var.banco_usuario}:${var.banco_senha}@${local.banco_host}:5432/${var.banco_nome}?schema=public"
}
