# Análise estática com SonarQube (self-hosted)

O SonarQube faz **SAST** (Static Application Security Testing): analisa o **nosso
código** em busca de bugs, *code smells*, *security hotspots* e vulnerabilidades.
Ele **complementa** o `npm audit` — que analisa as **dependências** (`node_modules`),
não o código que escrevemos. Os dois juntos cobrem código + dependências.

## Pré-requisito do host (uma vez)

O SonarQube embute um Elasticsearch, que exige um limite de memória virtual maior:

```bash
sudo sysctl -w vm.max_map_count=262144
# Para tornar permanente:
echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-sonarqube.conf
```

## 1. Subir o SonarQube

```bash
docker compose -f docker-compose.sonar.yml up -d
```

A primeira subida leva ~1–2 min (Elasticsearch). Acompanhe com:

```bash
docker compose -f docker-compose.sonar.yml logs -f sonarqube
# pronto quando aparecer: "SonarQube is operational"
```

Acesse **http://localhost:9000** — login inicial `admin` / `admin` (troque a senha).

## 2. Gerar um token de análise

No SonarQube: **My Account → Security → Generate Token** (tipo *Global Analysis Token*).
Guarde o token (ex.: em `SONAR_TOKEN`).

## 3. Gerar a cobertura de testes

O Sonar lê o relatório `lcov` do Jest. Gere antes de cada análise:

```bash
npm run test:cov   # cria coverage/lcov.info
```

## 4. Rodar o scanner

Sem instalar nada no host, via container oficial do scanner:

```bash
docker run --rm \
  --network host \
  -e SONAR_HOST_URL=http://localhost:9000 \
  -e SONAR_TOKEN=<seu-token> \
  -v "$PWD:/usr/src" \
  sonarsource/sonar-scanner-cli
```

O scanner usa o `sonar-project.properties` da raiz (chaves do projeto, fontes,
testes, exclusões e o caminho do `lcov`). Ao terminar, o resultado aparece em
**http://localhost:9000** no projeto *Workshop Manager (Oficina)*.

## 5. Ler o resultado

- **Security / Security Hotspots:** o que importa para o relatório de
  vulnerabilidades — pontos de código que merecem revisão (ex.: segredos,
  validação, criptografia).
- **Reliability (Bugs)** e **Maintainability (Code Smells):** qualidade.
- **Coverage:** vem do `lcov` (foco em `dominio/` e `aplicacao/`).
- **Quality Gate:** PASSED/FAILED segundo as regras do Sonar.

> Para a entrega, exporte/printe o painel do projeto e os *Security Hotspots*
> e anexe ao relatório de vulnerabilidades (junto com a saída do `npm audit`).

## Encerrar

```bash
docker compose -f docker-compose.sonar.yml down        # mantém os dados
docker compose -f docker-compose.sonar.yml down -v     # apaga tudo (volumes)
```
