from dataTypes import JsonArray, JsonObject, JsonPrimitive, JsonValue
from typing import Any
from math import isfinite
from datetime import datetime


def normalizeValue(value: Any) -> JsonValue:
    if value is None:
        return None

    if isinstance(value, (str, bool)):
        return value

    if isinstance(value, (int, float)):
        if value == 0 and str(value).startswith('-'):
            return 0
        if not isfinite(value):
            return None
        return value

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, list):
        return [normalizeValue(item) for item in value]

    if isinstance(value, set):
        return [normalizeValue(item) for item in value]

    if isinstance(value, dict) and isPlainObject(value):
        result: dict[str, JsonValue] = {}
        for key, val in value.items():
            result[str(key)] = normalizeValue(val)
        return result

    return None


def isJsonPrimitive(value: Any) -> bool:
    return value is None or isinstance(value, (str, int, float, bool))


def isJsonArray(value: Any) -> bool:
    return isinstance(value, list)


def isJsonObject(value: Any) -> bool:
    return value is not None and isinstance(value, dict) and not isinstance(value, list)


def isPlainObject(value: Any) -> bool:
    if value is None or not isinstance(value, dict):
        return False
    prototype = type(value)
    return prototype == dict


def isArrayOfPrimitives(value: JsonArray) -> bool:
    return all(isJsonPrimitive(item) for item in value)


def isArrayOfArrays(value: JsonArray) -> bool:
    return all(isinstance(item, list) for item in value)


def isArrayOfObjects(value: JsonArray) -> bool:
    return all(isJsonObject(item) for item in value)