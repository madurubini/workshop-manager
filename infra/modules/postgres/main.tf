# Postgres no cluster: StatefulSet (e não Deployment) porque banco tem estado —
# nome de pod estável e volume próprio que sobrevive ao pod.

locals {
  labels = merge(var.labels, {
    "app.kubernetes.io/name"      = var.nome
    "app.kubernetes.io/component" = "database"
  })
}

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

# Headless: publica o nome no DNS interno apontando direto para o pod.
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

          # Subdiretório do volume: o initdb exige diretório vazio, e o ponto de
          # montagem do PVC costuma trazer um lost+found.
          env {
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          volume_mount {
            name       = "dados"
            mount_path = "/var/lib/postgresql/data"
          }

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

  # O apply só termina com o banco aceitando conexão, então o Job de migrations
  # nunca corre antes da hora.
  wait_for_rollout = true
}
