from dataTypes import Depth
from constants import LIST_ITEM_PREFIX
from typing import Optional
class LineWriter:
    def __init__(self, indentSize: Optional[int]):
        self._lines: list[str] = []
        self.indentationString: str

        def LineWriter(indentSize: int):
            self.indentationString = ' ' * indentSize
        
        def push(depth: Depth, content: str) -> None:
            indent = self.indentationString * depth
            self._lines.append(f"{indent}{content}")

        def pushListItem(depth: Depth, content: str) -> None:
            self.push(depth, f"{LIST_ITEM_PREFIX}{content}")

        def toString() -> str:
            return '\n'.join(self._lines)
        
            