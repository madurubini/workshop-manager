# Atalhos do ambiente local. Os comandos completos estão no README.
#   make ajuda

SHELL := /bin/bash
NAMESPACE ?= oficina
IMAGEM    ?= oficina-api:local

.PHONY: ajuda cluster infra imagem manifestos deploy url carga sem-carga estado logs testes destruir

ajuda: ## Lista os alvos
	@grep -E '^[a-z-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

cluster: ## Sobe o Minikube e habilita o metrics-server (necessário para o HPA)
	minikube start --driver=docker --cpus=4 --memory=6144
	minikube addons enable metrics-server

infra: ## Provisiona namespace, Secrets e Postgres com Terraform
	cd infra && terraform init -input=false && terraform apply -input=false -auto-approve

imagem: ## Constrói a imagem DENTRO do daemon do Minikube
	# Buildar no daemon do cluster dispensa registry e evita o cache de tag antiga
	# que o `minikube image load` deixa quando a tag já existe.
	eval $$(minikube docker-env) && docker build -t $(IMAGEM) .

manifestos: ## Aplica os manifestos da aplicação
	# O Job é recriado porque os campos de um Job concluído são imutáveis.
	kubectl delete job migracoes -n $(NAMESPACE) --ignore-not-found
	kubectl apply -f k8s/configmap.yaml -f k8s/job-migracoes.yaml \
	              -f k8s/deployment.yaml -f k8s/service.yaml -f k8s/hpa.yaml
	kubectl wait --for=condition=complete job/migracoes -n $(NAMESPACE) --timeout=300s
	kubectl rollout restart deployment/oficina-api -n $(NAMESPACE)
	kubectl rollout status  deployment/oficina-api -n $(NAMESPACE) --timeout=300s

deploy: infra imagem manifestos ## Ciclo completo: infra + imagem + manifestos
	@$(MAKE) --no-print-directory url

url: ## Mostra a URL da API e do Swagger
	@echo "API:     http://$$(minikube ip):30080/api/v1"
	@echo "Swagger: http://$$(minikube ip):30080/api/docs"

carga: ## Sobe o gerador de carga para ver o HPA escalar
	kubectl apply -f k8s/gerador-carga.yaml
	@echo "Acompanhe com: watch kubectl get hpa,pods -n $(NAMESPACE)"

sem-carga: ## Remove o gerador de carga
	kubectl delete -f k8s/gerador-carga.yaml --ignore-not-found

estado: ## Retrato do namespace
	kubectl get all,pvc,configmap,secret,hpa -n $(NAMESPACE)

logs: ## Segue os logs da API
	kubectl logs -f -l app.kubernetes.io/name=oficina-api -n $(NAMESPACE) --max-log-requests=10

testes: ## Lint + unitários com cobertura + e2e
	npm run lint && npm run test:cov && npm run test:e2e

destruir: ## Remove a aplicação e a infraestrutura do cluster
	kubectl delete -f k8s/ --ignore-not-found || true
	cd infra && terraform destroy -input=false -auto-approve
