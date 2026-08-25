# O provider é a "ponte" entre o Terraform e a plataforma alvo. Aqui ele fala
# com a API do Kubernetes usando o mesmo arquivo de credenciais que o kubectl,
# criado pelo `minikube start`.
provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kube_context
}
