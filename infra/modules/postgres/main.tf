# ─────────────────────────────────────────────────────────────────────────────
# Módulo: Postgres no cluster (StatefulSet + volume persistente + Service)
#
# Um módulo agrupa recursos que sempre andam juntos e podem ser reaproveitados
# com parâmetros diferentes (ex.: um banco de homologação e outro de produção).
# ─────────────────────────────────────────────────────────────────────────────

locals {
  labels = merge(var.labels, {
    "app.kubernetes.io/name"      = var.nome
    "app.kubernetes.io/component" = "database"
  })
}

# Credenciais que a própria imagem do Postgres lê para criar o banco no
# primeiro boot. Ficam separadas do Secret da aplicação de propósito: quem
# administra o banco não precisa ver o segredo do JWT, e vice-versa.
resource "kubernetes_secret" "credenciais" {
  metadata {
    name      = "${var.nome}-credenciais"
    namespace = var.namespace
    labels    = local.labels
  }

  data = {
    POSTGRES_USER     = var.usuario
    POSTGRES_PASSWORD = var.senha
    POSTGRES_DB       = var.banco
  }

  type = "Opaque"
}

# Service headless (cluster_ip = "None"): não cria IP virtual nem balanceia,
# só publica o nome no DNS interno apontando direto para o pod. É o
# recomendado para StatefulSet, em que cada réplica tem identidade própria e
# você quer falar com uma específica — não com "qualquer uma".
resource "kubernetes_service" "banco" {
  metadata {
    name      = var.nome
    namespace = var.namespace
    labels    = local.labels
  }

  spec {
    cluster_ip = "None"

    selector = {
      "app.kubernetes.io/name" = var.nome
    }

    port {
      name        = "postgres"
      port        = 5432
      target_port = 5432
    }
  }
}

# StatefulSet, e não Deployment, porque banco de dados tem estado:
#   - o pod ganha nome estável (oficina-db-0), que sobrevive a reinícios;
#   - cada réplica recebe SEU volume, criado pelo volume_claim_template;
#   - o volume NÃO é apagado quando o pod morre — os dados persistem.
resource "kubernetes_stateful_set" "banco" {
  metadata {
    name      = var.nome
    namespace = var.namespace
    labels    = local.labels
  }

  spec {
    service_name = kubernetes_service.banco.metadata[0].name
    replicas     = 1

    selector {
      match_labels = {
        "app.kubernetes.io/name" = var.nome
      }
    }

    template {
      metadata {
        labels = local.labels
      }

      spec {
        container {
          name  = "postgres"
          image = var.imagem

          port {
            name           = "postgres"
            container_port = 5432
          }

          env_from {
            secret_ref {
              name = kubernetes_secret.credenciais.metadata[0].name
            }
          }

          # O Postgres cria os arquivos em um subdiretório do volume montado:
          # o ponto de montagem raiz de um PVC costuma trazer um lost+found,
          # e o initdb exige diretório vazio.
          env {
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          volume_mount {
            name       = "dados"
            mount_path = "/var/lib/postgresql/data"
          }

          # pg_isready responde se o banco aceita conexões. Enquanto não
          # responder, o Service não encaminha tráfego para este pod.
          readiness_probe {
            exec {
              command = ["pg_isready", "-U", var.usuario, "-d", var.banco]
            }
            initial_delay_seconds = 5
            period_seconds        = 5
            failure_threshold     = 6
          }

          liveness_probe {
            exec {
              command = ["pg_isready", "-U", var.usuario, "-d", var.banco]
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            failure_threshold     = 6
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "192Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }
        }
      }
    }

    # Molde do volume: o Kubernetes cria um PersistentVolumeClaim por réplica.
    # No Minikube o storage-provisioner atende esse pedido automaticamente.
    volume_claim_template {
      metadata {
        name = "dados"
      }

      spec {
        access_modes = ["ReadWriteOnce"]

        resources {
          requests = {
            storage = var.tamanho_volume
          }
        }
      }
    }
  }

  # O StatefulSet só é considerado pronto quando o pod passa na readiness —
  # assim o `terraform apply` só termina com o banco de fato aceitando conexão.
  wait_for_rollout = true
}
