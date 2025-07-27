
# 🐳 Docker Support

## Quick Start with Docker

```bash
# Build and serve with Docker
docker run --rm -p 8080:80 -v $(pwd)/src:/site itlackey/dompile

# Development with live reload
docker run --rm -p 3000:3000 -v $(pwd)/src:/site itlackey/dompile \
  dompile serve --source /site --output /var/www/html --port 3000 --host 0.0.0.0
```

## Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  dompile:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./src:/site
    environment:
      - NODE_ENV=production
```