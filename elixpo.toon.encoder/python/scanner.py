from typing import List, Optional, Dict, Any, NamedTuple, Tuple
from constants import SPACE, TAB

class BlankLineInfo(NamedTuple):
    line_number: int
    indent: int
    depth: int

class ParsedLine(NamedTuple):
    raw: str
    indent: int
    content: str
    depth: int
    line_number: int

class ScanResult(NamedTuple):
    lines: List[ParsedLine]
    blank_lines: List[BlankLineInfo]

class LineCursor:
    def __init__(self, lines: List[ParsedLine], blank_lines: Optional[List[BlankLineInfo]] = None):
        self.lines = lines
        self.index = 0
        self.blank_lines = blank_lines if blank_lines is not None else []

    def get_blank_lines(self) -> List[BlankLineInfo]:
        return self.blank_lines

    def peek(self) -> Optional[ParsedLine]:
        if self.index < len(self.lines):
            return self.lines[self.index]
        return None

    def next(self) -> Optional[ParsedLine]:
        if self.index < len(self.lines):
            result = self.lines[self.index]
            self.index += 1
            return result
        return None

    def current(self) -> Optional[ParsedLine]:
        if self.index > 0 and self.index <= len(self.lines):
            return self.lines[self.index - 1]
        return None

    def advance(self) -> None:
        self.index += 1

    def at_end(self) -> bool:
        return self.index >= len(self.lines)

    @property
    def length(self) -> int:
        return len(self.lines)

    def peek_at_depth(self, target_depth: int) -> Optional[ParsedLine]:
        line = self.peek()
        if line and line.depth == target_depth:
            return line
        return None

def to_parsed_lines(source: str, indent_size: int, strict: bool) -> ScanResult:
    if not source.strip():
        return ScanResult(lines=[], blank_lines=[])

    lines = source.split('\n')
    parsed: List[ParsedLine] = []
    blank_lines: List[BlankLineInfo] = []

    for i, raw in enumerate(lines):
        line_number = i + 1
        indent = 0
        while indent < len(raw) and raw[indent] == SPACE:
            indent += 1

        content = raw[indent:]

        # Track blank lines
        if not content.strip():
            depth = compute_depth_from_indent(indent, indent_size)
            blank_lines.append(BlankLineInfo(line_number, indent, depth))
            continue

        depth = compute_depth_from_indent(indent, indent_size)

        # Strict mode validation
        if strict:
            whitespace_end_index = 0
            while whitespace_end_index < len(raw) and (raw[whitespace_end_index] == SPACE or raw[whitespace_end_index] == TAB):
                whitespace_end_index += 1

            # Check for tabs in leading whitespace (before actual content)
            if TAB in raw[:whitespace_end_index]:
                raise SyntaxError(f"Line {line_number}: Tabs are not allowed in indentation in strict mode")

            # Check for exact multiples of indent_size
            if indent > 0 and indent % indent_size != 0:
                raise SyntaxError(f"Line {line_number}: Indentation must be exact multiple of {indent_size}, but found {indent} spaces")

        parsed.append(ParsedLine(raw, indent, content, depth, line_number))

    return ScanResult(lines=parsed, blank_lines=blank_lines)

def compute_depth_from_indent(indent_spaces: int, indent_size: int) -> int:
    return indent_spaces // indent_size