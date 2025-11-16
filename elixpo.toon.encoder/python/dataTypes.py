from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Union, Dict, List, Any, Literal, TypeAlias
from constants import Delimiter, DelimiterKey

# #region JSON types

JsonPrimitive: TypeAlias = Union[str, int, float, bool, None]
JsonObject: TypeAlias = Dict[str, 'JsonValue']
JsonArray: TypeAlias = List['JsonValue']
JsonValue: TypeAlias = Union[JsonPrimitive, JsonObject, JsonArray]

# #endregion

# #region Encoder options

__all__ = ['Delimiter', 'DelimiterKey']

@dataclass
class EncodeOptions:
    """Encoder configuration options."""
    indent: Optional[int] = 2
    """Number of spaces per indentation level. Default: 2"""
    
    delimiter: Optional[Delimiter] = None
    """Delimiter to use for tabular array rows and inline primitive arrays. Default: DELIMITERS.comma"""
    
    lengthMarker: Optional[Literal['#']] = None
    """Optional marker to prefix array lengths in headers. When set to '#', arrays render as [#N] instead of [N]. Default: False"""

@dataclass
class ResolvedEncodeOptions:
    """Resolved (required) encoder options."""
    indent: int
    delimiter: Delimiter
    lengthMarker: Union[Literal['#'], bool]

# #endregion

# #region Decoder options

@dataclass
class DecodeOptions:
    """Decoder configuration options."""
    indent: Optional[int] = 2
    """Number of spaces per indentation level. Default: 2"""
    
    strict: Optional[bool] = True
    """When true, enforce strict validation of array lengths and tabular row counts. Default: True"""

@dataclass
class ResolvedDecodeOptions:
    """Resolved (required) decoder options."""
    indent: int
    strict: bool

# #endregion

# #region Decoder parsing types

Depth: TypeAlias = int

@dataclass
class ArrayHeaderInfo:
    """Information about an array header."""
    length: int
    delimiter: Delimiter
    key: Optional[str] = None
    fields: Optional[List[str]] = None
    hasLengthMarker: bool = False

@dataclass
class ParsedLine:
    """Information about a parsed line."""
    raw: str
    depth: Depth
    indent: int
    content: str
    lineNumber: int

@dataclass
class BlankLineInfo:
    """Information about a blank line."""
    lineNumber: int
    indent: int
    depth: Depth

# #endregiong