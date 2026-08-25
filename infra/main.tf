# ─────────────────────────────────────────────────────────────────────────────
# Plataforma da aplicação: namespace, segredos e banco de dados.
#
# Divisão de responsabilidade com /k8s:
#   - aqui (Terraform) fica o que tem ESTADO e o que é SENSÍVEL — o namespace,
#     os Secrets e o Postgres com seu volume;
#   - em /k8s ficam os manifestos da aplicação (Deployment, Service, ConfigMap,
#     HPA e o Job de migrations), aplicados com kubectl depois deste apply.
# ─────────────────────────────────────────────────────────────────────────────

# Namespace é a divisória lógica do cluster: agrupa os objetos, permite cotas
# e evita colisão de nomes com outras aplicações no mesmo cluster.
resource "kubernetes_namespace" "oficina" {
  metadata {
    name   = var.namespace
    labels = local.labels_comuns
  }
}

# Banco de dados (módulo em ./modules/postgres).
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

# Segredos que a API consome (o Deployment em k8s/deployment.yaml faz
# `envFrom: secretRef: oficina-secrets`). Criá-los aqui, e não em YAML, é o que
# mantém credencial fora do repositório: o valor vem de variável do Terraform.
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

  # O banco precisa existir antes: a URL acima aponta para o Service dele.
  depends_on = [module.postgres]
}
