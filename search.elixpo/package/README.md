# lixSearch Packages

| Package | Directory | PyPI | Description |
|---------|-----------|------|-------------|
| **lix-open-search** | [`lix_open_search_pkg/`](lix_open_search_pkg/) | [`pip install lix-open-search`](https://pypi.org/project/lix-open-search/) | Python client SDK + Docker image |
| **lix-open-cache** | [`lix_open_cache_pkg/`](lix_open_cache_pkg/) | [`pip install lix-open-cache`](https://pypi.org/project/lix-open-cache/) | Standalone Redis caching library |

## Build & Publish

```bash
# Individual packages
./deploy.sh release build cache       # build lix-open-cache
./deploy.sh release build search      # build lix-open-search
./deploy.sh release pypi cache        # upload lix-open-cache to PyPI
./deploy.sh release pypi search       # upload lix-open-search to PyPI
./deploy.sh release docker            # push Docker image
./deploy.sh release all               # everything
```
