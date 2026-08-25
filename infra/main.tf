# Provisiona a plataforma: namespace, segredos e banco. Os manifestos da
# aplicação ficam em ../k8s e são aplicados com kubectl DEPOIS deste apply.

resource "kubernetes_namespace" "oficina" {
  metadata {
    name   = var.namespace
    labels = local.labels_comuns
  }
}

module "postgres" {
  source = "./modules/postgres"

  namespace      = kubernetes_namespace.oficina.metadata[0].name
  nome           = local.banco_host
  imagem         = var.banco_imagem
  usuario        = var.banco_usuario
  senha          = var.banco_senha
  banco          = var.banco_nome
  tamanho_volume = var.banco_tamanho_volume
  labels         = local.labels_comuns
}

# Consumido pelo Deployment em k8s/deployment.yaml via envFrom.
resource "kubernetes_secret" "aplicacao" {
  metadata {
    name      = "oficina-secrets"
    namespace = kubernetes_namespace.oficina.metadata[0].name
    labels    = local.labels_comuns
  }

  data = {
    DATABASE_URL = local.database_url
    JWT_SECRET   = var.jwt_secret
  }

  type = "Opaque"

  depends_on = [module.postgres]
}
