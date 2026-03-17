# Security Policy

## Security Reporting

**Do NOT open public GitHub issues for security vulnerabilities.**

If you discover a security vulnerability, please email [security@elixpo.ai](mailto:security@elixpo.ai) with:

- Description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Suggested fix (if you have one)

**Please include:**
- Your name and contact information
- Affected versions
- Environment details
- Proof of concept or detailed reproduction steps

We will acknowledge receipt within 24 hours and aim to provide updates every 48 hours.

## Security Advisories

Published security advisories are available in the [GitHub Security Advisories](https://github.com/elixpo/lixsearch/security/advisories) section.

## Supported Versions

| Version | Status | End of Life |
|---------|--------|-------------|
| 1.x     | Active | TBD        |
| 0.x     | Legacy | 2025-12-31 |

We recommend always running the latest version for security patches.

## Known Security Considerations

### Vector Database (Chroma)

- Chroma server runs in HTTP mode (not HTTPS in standard deployment)
- For production, use reverse proxy (nginx, Cloudflare) with TLS
- Database files should be in a secure directory with restricted permissions

**Recommendation:**
```bash
# Secure permissions for embeddings directory
chmod 700 /path/to/data/embeddings/
```

### API Gateway

- Load balancer and workers communicate over internal Docker network
- external traffic only through load balancer port 8000
- Rate limiting should be implemented at reverse proxy

**Recommended reverse proxy setup:**
```nginx
# nginx example
server {
    listen 443 ssl http2;
    server_name lixsearch.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    
    location /api {
        limit_req zone=api burst=10;
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### IPC Service

- IPC service on port 5010 is internal only
- Accessible only from workers on same Docker network
- Authkey: `b"ipcService"` - Change in production

**To change IPC key:**
```python
# In config.py
IPC_AUTHKEY = b"your-secure-authkey-here"
```

### Input Validation

- All user inputs are validated at API boundary
- Query strings sanitized before vector DB operations
- Web scraping using Playwright with headless mode
- APIKey/auth tokens should be managed separately (not in this repo)

### Dependencies

Review dependencies regularly:
```bash
# Check for vulnerabilities
pip-audit

# Update dependencies
pip install --upgrade -r requirements.txt
```

## Security Best Practices for Deployment

### 1. Use HTTPS/TLS

Always use a reverse proxy with TLS for production:
```bash
# Example with Let's Encrypt + nginx
certbot certonly --nginx -d lixsearch.example.com
```

### 2. Secure Credentials

- Never commit API keys, secrets, or credentials
- Use environment variables or secure vaults (AWS Secrets Manager, HashiCorp Vault)
- Rotate credentials regularly

**Example .env (never commit):**
```bash
LLM_API_KEY=sk-...
VECTOR_DB_PASSWORD=...
```

### 3. Network Security

- Restrict access to ports (load balancer only on 8000)
- Use firewall rules to limit traffic sources
- Consider VPN/bastion host for admin access

### 4. Resource Limits

Set Docker resource limits:
```yaml
# docker-compose.yml
services:
  elixpo-search-worker-1:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

### 5. Logging & Monitoring

- Monitor logs for suspicious activity
- Set up alerts for high error rates
- Implement access logging

```python
# In config.py
ENABLE_REQUEST_TRACING = True
ENABLE_PERFORMANCE_METRICS = True
```

### 6. Regular Updates

Keep all components updated:
```bash
# Update Docker base image
docker pull python:3.12-slim-bullseye

# Update dependencies
pip install --upgrade -r requirements.txt

# Update ChromaDB
docker pull chromadb/chroma:latest
```

## Security Checklist for Production

- [ ] TLS/HTTPS enabled via reverse proxy
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] API credentials managed securely (not in code)
- [ ] Database permissions restricted (chmod 700)
- [ ] Regular backups configured
- [ ] Monitoring and logging enabled
- [ ] IPC authkey changed from default
- [ ] Docker resource limits set
- [ ] Regular security updates scheduled
- [ ] Access logs monitored
- [ ] Disaster recovery plan documented
- [ ] Security audit performed

## Vulnerability Disclosure Policy

### Timeline

1. **Day 0**: Security report received and acknowledged
2. **Day 1-2**: Investigation and verification
3. **Day 3-5**: Fix development begins
4. **Day 7-14**: Fix completed and tested
5. **Day 14-21**: Patch released with advisory
6. **Day 21+**: Advisory published publicly

### Scope

Security vulnerabilities in lixSearch include:

✅ **Included:**
- Authentication bypasses
- Unauthorized data access
- Code execution flaws
- Cryptographic weaknesses
- Injection vulnerabilities
- Resource exhaustion

❌ **Not included:**
- Social engineering attacks
- Third-party library vulnerabilities (report to library maintainers)
- Configuration mistakes by users
- Infrastructure provider issues
- Physical security issues

## Third-Party Dependencies

We use the following key dependencies (review their security policies):

- **ChromaDB**: [https://github.com/chroma-core/chroma](https://github.com/chroma-core/chroma)
- **Sentence Transformers**: [https://github.com/UKPLab/sentence-transformers](https://github.com/UKPLab/sentence-transformers)
- **Quart**: [https://github.com/pallets/quart](https://github.com/pallets/quart)
- **Playwright**: [https://github.com/microsoft/playwright-python](https://github.com/microsoft/playwright-python)

Review their security advisories regularly.

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE: Common Weakness Enumeration](https://cwe.mitre.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Python Security Best Practices](https://python.readthedocs.io/en/latest/library/security.html)

## Questions?

- 📧 Security issue: [security@elixpo.ai](mailto:security@elixpo.ai)
- 🐛 General issues: [support@elixpo.ai](mailto:support@elixpo.ai)
- 💬 Discussions: [GitHub Discussions](https://github.com/elixpo/lixsearch/discussions)

---

## Security History

No known security vulnerabilities at this time.

**Last security audit**: February 25, 2026

Thank you for helping keep lixSearch secure! 🔒
