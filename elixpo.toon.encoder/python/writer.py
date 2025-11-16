from dataTypes import Depth
from constants import LIST_ITEM_PREFIX

class LineWriter:
    def __init__(self, indentSize: int):
        self._lines: list[str] = []
        self._indentationString: str = ' ' * indentSize
        
    def push(self, depth: Depth, content: str) -> None:
        indent = self._indentationString * depth
        self._lines.append(indent + content)

    def pushListItem(self, depth: Depth, content: str) -> None:
        self.push(depth, f"{LIST_ITEM_PREFIX}{content}")

    def toString(self) -> str:
        return '\n'.join(self._lines)