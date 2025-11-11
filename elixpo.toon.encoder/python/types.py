from dataclasses import dataclass
from typing import Optional
@dataclass
class Depth : int

@dataclass
class ParsedLine:
    raw: str
    depth: Depth   
    indent: int
    content: str
    line_number: int

#dummy class to represent delimeter info
@dataclass
class Delimeter:
    prefix: str
    suffix: str
@dataclass
class ArrayHeaderInfo:
    key: Optional[str] = None
    length: int 
    delimiter: Delimeter
    fields: Optional[list[str]] = None
    hasLengthMarker: bool

@dataclass
class BlankLineInfo:
    lineNumber: int 
    indent: int 
    depth: Depth

@dataclass
class DecodeOptions:
    indent: Optional[int] = 2
    strict: Optional[bool] = True

@dataclass
class EncodeOptions:
    indent: Optional[int] = 2
    delimeter: Optional[Delimeter] = ','
    lengthMarker: Optional[bool] = '#' or False