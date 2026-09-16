# Deploying SkyPulse

The app is a single container: FastAPI serves the API **and** the built React app on one port.

## 1. Environment variables

See `.env.example`. Minimum for a working deployment:

```
OPENWEATHER_API_KEY=…      # required
GROQ_API_KEY=…             # optional — enables AI chat + briefing (or OPENROUTER_API_KEY / HF_API_KEY)
ORS_API_KEY=…              # optional — real driving routes for the Journey planner
ALLOWED_ORIGINS=https://your-domain.example
HOST=0.0.0.0
PORT=80
LOG_JSON=true
```

Never commit real keys. Rotate any key that has ever been committed.

## 2. Docker (any host)

```bash
docker build -t skypulse .
docker run -d --name skypulse -p 80:80 --env-file .env skypulse
curl http://localhost/api/health
```

The image listens on `PORT` (default 80) and exposes `/api/health` for orchestrator probes.

## 3. Render

`render.yaml` is included. Create a Blueprint from the repo, add the secret env vars in the
dashboard, and Render builds the Dockerfile and health-checks `/api/health`.

## 4. AWS EC2 via GitHub Actions

`.github/workflows/ci.yml` runs on every push (lint, tests, build, image build).
`.github/workflows/docker-build.yml` runs after CI succeeds on `main`: it pushes the image to Docker
Hub and rolls the container on EC2 over SSH.

Repository secrets needed:

| Secret | Purpose |
|---|---|
| `DOCKER_USERNAME`, `DOCKER_PASSWORD` | Docker Hub push |
| `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` | SSH deploy target |
| `OPENWEATHER_API_KEY` | weather data |
| `GROQ_API_KEY`, `ORS_API_KEY` | optional features |
| `ALLOWED_ORIGINS` | CORS for your domain |

The EC2 security group must allow inbound 80 (and 443 if you terminate TLS with Caddy/nginx in
front — recommended).

## 5. Branch strategy

* `main` — stable v1 line. Only hotfixes.
* `v2` — this upgrade. Open a PR from `v2` to `main` when you are ready to promote it; CI must be green.

## 6. Scaling beyond one container

The TTL caches and rate limiter are in-process. For multiple replicas, back them with Redis
(see `docs/ARCHITECTURE.md` → Scaling notes) and put the replicas behind a load balancer with
sticky-less round robin; the app is otherwise stateless.
