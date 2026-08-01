"""Small GitHub Discussions GraphQL client.

GitHub does not expose Discussions through its REST API. This wrapper keeps the
GraphQL details out of squads and accepts an injected ``GitHubAPI`` for tests.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DiscussionCategory:
    id: str
    name: str
    slug: str


class GitHubDiscussions:
    def __init__(self, api, owner: str, repo: str):
        self.api = api
        self.owner = owner
        self.repo = repo

    async def repository(self) -> dict:
        data = await self.api.graphql(
            """
            query($owner: String!, $repo: String!) {
              repository(owner: $owner, name: $repo) {
                id
                discussionCategories(first: 50) {
                  nodes { id name slug }
                }
              }
            }
            """,
            {"owner": self.owner, "repo": self.repo},
        )
        repository = data.get("repository")
        if not repository:
            raise RuntimeError(f"repository {self.owner}/{self.repo} was not found")
        return repository

    async def category(self, *aliases: str) -> DiscussionCategory:
        repository = await self.repository()
        wanted = {alias.casefold().replace("&", "and").replace(" ", "") for alias in aliases}
        for raw in repository["discussionCategories"]["nodes"]:
            values = (raw["name"], raw["slug"])
            normalized = {
                value.casefold().replace("&", "and").replace("-", "").replace(" ", "")
                for value in values
            }
            if wanted & normalized:
                return DiscussionCategory(id=raw["id"], name=raw["name"], slug=raw["slug"])
        available = ", ".join(node["name"] for node in repository["discussionCategories"]["nodes"])
        raise RuntimeError(f"missing discussion category {aliases[0]!r}; available: {available}")

    async def recent(self, limit: int = 30) -> list[dict]:
        data = await self.api.graphql(
            """
            query($owner: String!, $repo: String!, $limit: Int!) {
              repository(owner: $owner, name: $repo) {
                discussions(first: $limit, orderBy: {field: UPDATED_AT, direction: DESC}) {
                  nodes { id number title body url category { name } }
                }
              }
            }
            """,
            {"owner": self.owner, "repo": self.repo, "limit": limit},
        )
        return data["repository"]["discussions"]["nodes"]

    async def create(self, category_id: str, title: str, body: str) -> dict:
        repository = await self.repository()
        data = await self.api.graphql(
            """
            mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
              createDiscussion(input: {
                repositoryId: $repositoryId, categoryId: $categoryId,
                title: $title, body: $body
              }) { discussion { id number title url } }
            }
            """,
            {
                "repositoryId": repository["id"],
                "categoryId": category_id,
                "title": title,
                "body": body,
            },
        )
        return data["createDiscussion"]["discussion"]

    async def comments(self, discussion_number: int, limit: int = 30) -> list[dict]:
        data = await self.api.graphql(
            """
            query($owner: String!, $repo: String!, $number: Int!, $limit: Int!) {
              repository(owner: $owner, name: $repo) {
                discussion(number: $number) {
                  comments(last: $limit) {
                    nodes {
                      id body createdAt author { login }
                      replies(last: 20) { nodes { id body createdAt author { login } } }
                    }
                  }
                }
              }
            }
            """,
            {"owner": self.owner, "repo": self.repo, "number": discussion_number, "limit": limit},
        )
        discussion = data["repository"].get("discussion")
        if not discussion:
            raise RuntimeError(f"discussion #{discussion_number} was not found")
        nodes = discussion["comments"]["nodes"]
        return [item for node in nodes for item in (node, *node["replies"]["nodes"])]

    async def add_comment(self, discussion_id: str, body: str, reply_to_id: str | None = None) -> dict:
        data = await self.api.graphql(
            """
            mutation($discussionId: ID!, $body: String!, $replyToId: ID) {
              addDiscussionComment(input: {
                discussionId: $discussionId, body: $body, replyToId: $replyToId
              }) { comment { id url } }
            }
            """,
            {"discussionId": discussion_id, "body": body, "replyToId": reply_to_id},
        )
        return data["addDiscussionComment"]["comment"]
