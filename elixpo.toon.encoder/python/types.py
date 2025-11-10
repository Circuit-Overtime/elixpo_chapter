from dataclasses import dataclass

@dataclass
class Depth : int

@dataclass
class ParsedLine:
    raw: str
    depth: Depth   
    indent: int
    content: str
    line_number: int