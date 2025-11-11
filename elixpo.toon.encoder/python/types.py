from dataclasses import dataclass
from typing import Optional, Union, Dict, List, any
from __future__ import annotations


JsonPrimitive = Union[str, int, float, bool, None]
JsonValue = Union[JsonPrimitive, "JsonObject", "JsonArray"]
JsonObject = Dict[str, JsonValue]
JsonArray = List[JsonValue]

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