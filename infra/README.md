# Infraestrutura como Código (Terraform)

Provisiona a **plataforma** onde a aplicação roda: o namespace, os segredos e o
banco de dados. Os manifestos da aplicação em si (Deployment, Service, ConfigMap,
HPA e o Job de migrations) ficam em [`../k8s`](../k8s) e são aplicados com
`kubectl` **depois** deste `apply`.

| Pasta | Responsabilidade | Por quê |
|---|---|---|
| `infra/` (aqui) | Namespace, Secrets, Postgres + volume | Tem **estado** (dados que precisam sobreviver) e carrega **credenciais** — o Terraform mantém o estado e injeta os segredos a partir de variáveis, sem versioná-los |
| `../k8s/` | Deployment, Service, ConfigMap, HPA, Job | São descartáveis e recriáveis a qualquer momento; YAML puro é mais direto de ler e de aplicar |

## Recursos criados

| Recurso | Nome | O que é |
|---|---|---|
| `kubernetes_namespace` | `oficina` | Divisória lógica do cluster: agrupa os objetos e evita colisão de nomes |
| `kubernetes_secret` | `oficina-secrets` | `DATABASE_URL` e `JWT_SECRET` consumidos pela API (`envFrom` no Deployment) |
| `kubernetes_secret` | `oficina-db-credenciais` | `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` lidos pela imagem do Postgres |
| `kubernetes_stateful_set` | `oficina-db` | Postgres 16. **StatefulSet** (e não Deployment) porque o banco tem estado: nome de pod estável e volume próprio que sobrevive ao pod |
| `kubernetes_service` | `oficina-db` | Service *headless* (`clusterIP: None`): publica o nome no DNS interno apontando direto para o pod, sem balanceamento |
| `PersistentVolumeClaim` | `dados-oficina-db-0` | Criado automaticamente pelo `volume_claim_template` do StatefulSet — 1Gi atendido pelo `storage-provisioner` do Minikube |

**5 recursos** no total (o PVC é criado pelo Kubernetes a partir do molde, não pelo Terraform).

## Estrutura

```
infra/
├── versions.tf              versões fixas do Terraform e dos providers + backend local
├── providers.tf             conexão com o cluster (usa o mesmo kubeconfig do kubectl)
├── variables.tf             entradas: namespace, credenciais, tamanho do volume
├── locals.tf                valores derivados (rótulos comuns, DATABASE_URL montada)
├── main.tf                  namespace + Secret da aplicação + chamada do módulo
├── outputs.tf               saídas úteis após o apply
└── modules/postgres/        o banco, isolado em módulo reutilizável
```

## Como aplicar

Pré-requisito: cluster no ar (`minikube start`) e `kubectl` funcionando.

```bash
cd infra

# 1. Baixa os providers e prepara o backend. Roda uma vez (ou após mudar versões).
terraform init

# 2. Opcional: personalize os valores (senha, tamanho do volume...).
cp terraform.tfvars.example terraform.tfvars   # terraform.tfvars NÃO é versionado

# 3. Mostra o que será criado, sem criar nada.
terraform plan

# 4. Cria de fato. O apply só termina quando o Postgres aceita conexão
#    (wait_for_rollout no StatefulSet).
terraform apply

# 5. Consulta as saídas.
terraform output
terraform output -raw database_url   # valores sensíveis exigem -raw explícito
```

Em seguida, a aplicação:

```bash
cd ..
kubectl apply -f k8s/ -n oficina
```

## Como remover

```bash
cd infra && terraform destroy
```

> ⚠️ O `destroy` apaga o PVC e, com ele, **os dados do banco**. Em um ambiente real,
> `prevent_destroy` no volume evitaria isso.

## Notas

- **Backend local**: o estado fica em `terraform.tfstate`, aqui na pasta. Serve para
  um ambiente de uma pessoa só; em equipe, o estado iria para um backend remoto
  (S3 + DynamoDB, Terraform Cloud) que suporta travamento e acesso concorrente.
- **Nuvem**: para levar isto a um EKS bastaria trocar o provider `kubernetes` pelo
  `aws` no provisionamento do cluster — o módulo `postgres` continuaria válido, ou
  daria lugar a um `aws_db_instance` (RDS).
