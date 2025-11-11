from dataTypes import Depth, JsonArray, JsonObject, JsonPrimitive, JsonValue, ResolvedEncodeOptions
from constants import LIST_ITEM_MARKER
from normalize import isArrayOfArrays, isArrayOfObjects, isArrayOfPrimitives, isJsonObject, isJsonArray, isJsonPrimitive
from primitive import encodePrimitive, encodeAndJoinPrimitives, encodeKey, formatHeader
from writer import LineWriter
from typing import Optional

def encodeValue(value: JsonValue, options: ResolvedEncodeOptions) -> str:
    if(isJsonPrimitive(value)):
        return encodePrimitive(value, options['delimiter'])
    writer = LineWriter(options['indent'])
    if(isJsonArray(value)):
        encodeArray(None, value, writer, 0, options)

def encodeArray(
        key: str | None,
        value: JsonArray,
        writer: LineWriter,
        depth: Depth, 
        options: ResolvedEncodeOptions
) -> None:
    if(len(value) == 0):
        header = formatHeader(0, {
            'key': key,
            'delimiter': options['delimiter'],
            'lengthMarker': options['lengthMarker']
        })
        writer.push(depth, header)
        return
    if(isArrayOfPrimitives(value)):
        formatted = encodeInlineArrayLine(value, options['delimiter'], key, options['lengthMarker'])
        writer.push(depth, formatted)
        return
    if (isArrayOfArrays(value)):
        allPrimitiveArrays = all(isArrayOfPrimitives(item) for item in value)
        if(allPrimitiveArrays):
            encodeArrayOfArraysAsListItems(key, value, writer, depth, options)
            return
    if (isArrayOfObjects(value)):
        header = extractTabularHeader(value)
        if(header):
            encodeArrayOfObjectsAsTabular(key, value, header, writer, depth, options)
        else:
            encodeMixedArrayAsListItems(key, value, writer, depth, options)
        return
    

def encodeArrayOfArraysAsListItems(
        prefix: str | None,
        values: JsonArray,
        writer: LineWriter,
        depth: Depth,
        options: ResolvedEncodeOptions

) -> None:
    header = formatHeader(
        len(values),
        {
            'key': prefix,
            'delimiter': options['delimiter'],
            'lengthMarker': options['lengthMarker']
        }
    )
    writer.push(depth, header)
    for arr in values:
        if(isArrayOfPrimitives(arr)):
            inline = encodeInlineArrayLine(arr, options['delimiter'], None, options['lengthMarker'])
            writer.pushListItem(depth + 1, inline)


def encodeInlineArrayLine(
        values: JsonPrimitive,
        delimiter: str,
        prefix: Optional[str],
        lengthMarker: Optional[bool] = '#' or False
) -> str:
    header = formatHeader(
        len(values),
        {
            'key': prefix,
            'delimiter': delimiter,
            'lengthMarker': lengthMarker
        }
    )
    joinedPrimitives = encodeAndJoinPrimitives(values, delimiter)
    if(len(values) == 0):
        return header
    return f"{header} {joinedPrimitives}"

def encodeArrayOfObjectsAsTabular(
        prefix: str | None,
        rows: JsonObject,
        header: list[str],
        writer: LineWriter,
        depth: Depth,
        options: ResolvedEncodeOptions
) -> None:
    pass