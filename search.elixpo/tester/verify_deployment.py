import requests

r = requests.post(
    "https://search.elixpo.com/v1/chat/completions",
    headers={"Authorization": "Bearer 45e79d739c635215c56550a50e041f8ffba3a6ee2e79a9be1421c23eb193f23a"},
    json={
        "model": "lixsearch",
        "messages": [{"role": "user", "content": "What are the latest developments in AI?"}],
        "stream": False,
    },
)
print(r.json()["choices"][0]["message"]["content"])