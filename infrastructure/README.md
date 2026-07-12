# Forge Infrastructure

This milestone includes local infrastructure only.

- `docker-compose.yml` starts PostgreSQL and the FastAPI backend.
- The Postgres service uses a persistent Docker volume named `forge_postgres_data`.
- The API container runs Alembic migrations and the idempotent exercise seed before serving traffic.
- AWS deployment, managed secrets, object storage, queues, observability, and CI/CD deployment are intentionally out of scope for milestone one.

Future AWS shape:

- API: ECS Fargate or App Runner behind an HTTPS load balancer.
- Database: RDS PostgreSQL with automated backups.
- Auth: Cognito behind the existing auth abstraction.
- Secrets: AWS Secrets Manager.
- Files and media: S3 when nutrition/media features arrive.
- Observability: CloudWatch logs, metrics, and traces.
