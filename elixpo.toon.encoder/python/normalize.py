from dataTypes import JsonArray, JsonObject, JsonPrimitive, JsonValue
from typing import Union, Optional
from math import isfinite
from datetime import datetime


def isPlainObject(value) -> str:
    if(value == None or not isinstance(value, object)):
        return False


def normalizeValue(value) -> JsonValue:
    if(value == None):
        return None
    elif isinstance(value, (str,bool)):
        return value
    elif isinstance(value, (int,float)):
        if(object.__getattribute__(value) == -0):
            return 0
        if(not isinstance(value, int) and (not isfinite(value))):
            return None
        return value
    elif isinstance(value, datetime):
        return value.isoformat()
    
    elif isinstance(value, list):
        return [normalizeValue(item) for item in value]
    elif isinstance(value, set):
        return [normalizeValue(item) for item in value]
    elif isinstance(value, dict):
        result = {}
        for key, val in value.items():
            result[str(key)] = normalizeValue(val)
        return result
    elif (isPlainObject(value)):
        result = dict[str, "JsonValue"] = {}
        for key, val in value.items():
            result[str(key)] = normalizeValue(val)
        return result

    else:
        return None