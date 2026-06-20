"""Project V2 kanban as durable state (GitHub Projects, GraphQL).

The board is the live dashboard: columns = state labels, one card per tracking
issue. Moving a card = changing the squad-visible state. Implemented in Phase D
alongside Pick/Submit, which are the first squads to drive it — it needs a
graphql() method on GitHubAPI plus the project's node id + status field/option
ids, all of which those squads define the access patterns for.

Planned surface:
    class Board:
        async def add_issue(self, issue_node_id) -> item_id
        async def set_status(self, item_id, column)        # "claimed" -> "awaiting_review"
        async def items_in(self, column) -> list[item]
"""

from __future__ import annotations

# TODO(Phase D): implement against the Projects v2 GraphQL API.
