# Fixa a versão do Terraform e de cada provider. Sem isso, um `terraform init`
# feito meses depois poderia baixar uma versão nova e incompatível.
terraform {
  required_version = ">= 1.6"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }

  # Backend local: o estado (terraform.tfstate) fica em disco, ao lado do
  # código. É o padrão e basta para um ambiente local — em equipe, o estado
  # iria para um backend remoto (S3, Terraform Cloud) para permitir trabalho
  # simultâneo e travamento.
  backend "local" {
    path = "terraform.tfstate"
  }
}
