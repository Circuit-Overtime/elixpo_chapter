from dataclasses import dataclass
from typing import Optional, Union, Dict, List, any
from __future__ import annotations
from constants import Delimiter, DelimiterKey, DEFAULT_DELIMITER

type JsonPrimitive = Union[str, int, float, bool, None]
type JsonValue = Union[JsonPrimitive, "JsonObject", "JsonArray"]
type JsonObject = Dict[str, JsonValue]
type JsonArray = List[JsonValue]




@dataclass
class ParsedLine:
    raw: str
    depth: Depth   
    indent: int
    content: str
    line_number: int

#dummy class to represent delimeter info

@dataclass
class ArrayHeaderInfo:
    key: Optional[str] = None
    length: int 
    delimiter: Delimiter
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
    delimiter: Optional[Delimiter] = DEFAULT_DELIMITER
    lengthMarker: Optional[bool] = '#' or False

type Depth = int

type ResolvedEncodeOptions = EncodeOptions