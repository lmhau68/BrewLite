# Task 3.2 – Deployment diagram

Nguồn PlantUML: [`deployment.puml`](./deployment.puml). Xuất ảnh để nộp: `plantuml -tsvg docs/diagrams/deployment.puml` (hoặc dùng extension *PlantUML* trong VS Code → Export). Bản Mermaid dưới đây hiển thị trực tiếp trên GitHub.

```mermaid
flowchart LR
  subgraph Local[Local - developer]
    compose[docker-compose<br/>web + api + db]
  end
  subgraph CI[CI - GitHub Actions]
    actions[Lint → Test → Build → Docker image]
    secrets[(GitHub Secrets)]
  end
  subgraph REG[GitHub Container Registry]
    imgweb[brewlite-web:sha]
    imgapi[brewlite-api:sha]
  end
  subgraph PROD[Production - Render]
    web[Next.js :3000]
    api[NestJS :4000<br/>/health]
    db[(PostgreSQL :5432<br/>persistent disk · private)]
    env[Env vars / secrets]
  end
  user([Trình duyệt / PWA])

  user -- HTTPS 443 --> web
  user -- "HTTPS 443 · REST + JWT" --> api
  api -- "TCP 5432 · mạng nội bộ" --> db
  actions --> imgweb & imgapi
  secrets -.-> actions
  imgweb -.pull.-> web
  imgapi -.pull.-> api
  actions -- "deploy + migrate" --> PROD
  env -.-> api
```

## Truy vết

| Thành phần trong sơ đồ | Mô tả kiến trúc | Mã nguồn |
|---|---|---|
| Next.js :3000 | architecture.md §3–4.1 | `frontend/brewlite` |
| NestJS :4000 | architecture.md §3–4.2 | `backend/brew-lite` |
| PostgreSQL :5432 | architecture.md §3, §5 | `backend/prisma/schema.prisma`, `docker-compose.yml` |
| GitHub Actions | architecture.md §5 | `.github/workflows/ci.yml` |
| Registry / Render | ADR-006 | *(Task 5: workflow CD, Dockerfile)* |

> Lưu ý: sơ đồ nền tảng (Render + GHCR) là **đề xuất** theo ADR-006. Khi nhóm chốt nền tảng thật, cập nhật lại sơ đồ này.
