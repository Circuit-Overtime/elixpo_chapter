# Security Policy

## Reporting a Vulnerability

**Do not open public GitHub issues for security vulnerabilities.**

Email **security@elixpo.ai** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Affected component (backend, frontend, cache library, Docker image)

We will acknowledge receipt within 24 hours and provide updates every 48 hours.

## Supported Versions

| Package | Version | Supported |
|---------|---------|-----------|
| lixSearch (backend) | 2.x | Active |
| lix-open-cache (PyPI) | 2.x | Active |
| lix-open-search (PyPI) | 2.x | Active |
| LixSearch (Docker) | latest | Active |

Always run the latest version for security patches.

## Architecture Security

### Network Isolation

All internal services communicate over a private Docker network. No internal ports are published to the host.

| Service | Port | Exposed to host? |
|---------|------|-----------------|
| nginx | 80, 443, 10001 | Yes (only entry point) |
| App workers | 9002 | No |
| IPC service | 9510 | No |
| ChromaDB | 9001 | No |
| Redis | 9530 | No |

### Authentication

- **nginx (port 10001)**: API key required via `X-API-Key` header or `?key=` query param
- **nginx (port 80)**: Internal/dev access, no API key
- **App-level**: `INTERNAL_API_KEY` env var for service-to-service calls
- **IPC service**: Shared authkey (`IPC_AUTHKEY` env var)
- **Redis**: Password-protected (`REDIS_PASSWORD` env var)

### Rate Limiting

nginx enforces per-IP rate limits:

| Endpoint | Limit |
|----------|-------|
| `/api/search`, `/v1/*` | 50 req/s, burst 10 |
| `/api/chat` | 30 req/s, burst 5 |
| `/api/session*` | 100 req/s, burst 20 |
| General | 100 req/s |

### Data Storage

- **Redis**: In-memory with AOF persistence. Stores session data (30-min hot window), semantic cache (5-min TTL), URL embeddings (24h TTL)
- **Disk archives**: Huffman-compressed `.huff` files with 30-day TTL, auto-cleaned on startup
- **ChromaDB**: Vector embeddings stored on persistent volume

No user credentials or PII are stored by the search engine itself.

## Deployment Checklist

- [ ] Change all default passwords in `.env` (`REDIS_PASSWORD`, `IPC_AUTHKEY`, `API_KEY`)
- [ ] Use TLS via reverse proxy (nginx, Cloudflare) for all external traffic
- [ ] Restrict firewall to only expose nginx ports (80, 443, 10001)
- [ ] Set Docker resource limits (CPU, memory) on app containers
- [ ] Enable access logging and monitor for anomalies
- [ ] Run `pip-audit` periodically against `requirements.txt`
- [ ] Keep base images updated (`python:3.11-slim`, `redis:7-alpine`, `chromadb/chroma`)
- [ ] Never commit `.env` files or credentials to version control

## Hidden File Protection

nginx blocks access to dotfiles (`.git`, `.env`, `.htaccess`, etc.):

```nginx
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
    return 404;
}
```

## Vulnerability Disclosure Timeline

| Day | Action |
|-----|--------|
| 0 | Report received and acknowledged |
| 1-2 | Investigation and verification |
| 3-7 | Fix development |
| 7-14 | Patch released |
| 14-21 | Advisory published |

## Scope

**In scope:**
- Authentication and authorization bypasses
- Injection vulnerabilities (SQL, command, SSRF)
- Unauthorized data access or leakage
- Code execution flaws
- Denial of service via application logic
- Cryptographic weaknesses

**Out of scope:**
- Social engineering
- Third-party dependency vulnerabilities (report upstream)
- User configuration errors
- Physical or infrastructure-level attacks

## Contact

- Security issues: security@elixpo.ai
- General issues: [GitHub Issues](https://github.com/pollinations/lixSearch/issues)

---

**Last reviewed**: March 2026
