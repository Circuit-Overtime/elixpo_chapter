from typing import List, Optional, Dict, Any, Tuple, Union
from literal_utils import isBooleanOrNullLiteral, isNumericLiteral
from string_utils import findClosingQuote, findUnquotedChar, unescapeString
from dataTypes import JsonPrimitive
from constants import Delimiter
from constants import (
    BACKSLASH, CLOSE_BRACE, CLOSE_BRACKET, COLON, DELIMITERS, DOUBLE_QUOTE,
    FALSE_LITERAL, NULL_LITERAL, OPEN_BRACE, OPEN_BRACKET, PIPE, TAB, TRUE_LITERAL
)



# #region Array header parsing

def parse_array_header_line(
    content: str,
    default_delimiter: Delimiter,
) -> Optional[Dict[str, Any]]:
    trimmed = content.lstrip()

    bracket_start = -1

    if trimmed.startswith(DOUBLE_QUOTE):
        closing_quote_index = findClosingQuote(trimmed, 0)
        if closing_quote_index == -1:
            return None

        after_quote = trimmed[closing_quote_index + 1:]
        if not after_quote.startswith(OPEN_BRACKET):
            return None

        leading_whitespace = len(content) - len(trimmed)
        key_end_index = leading_whitespace + closing_quote_index + 1
        bracket_start = content.find(OPEN_BRACKET, key_end_index)
    else:
        bracket_start = content.find(OPEN_BRACKET)

    if bracket_start == -1:
        return None

    bracket_end = content.find(CLOSE_BRACKET, bracket_start)
    if bracket_end == -1:
        return None

    colon_index = bracket_end + 1
    brace_end = colon_index

    brace_start = content.find(OPEN_BRACE, bracket_end)
    colon_after_bracket = content.find(COLON, bracket_end)
    if brace_start != -1 and (colon_after_bracket == -1 or brace_start < colon_after_bracket):
        found_brace_end = content.find(CLOSE_BRACE, brace_start)
        if found_brace_end != -1:
            brace_end = found_brace_end + 1

    colon_index = content.find(COLON, max(bracket_end, brace_end))
    if colon_index == -1:
        return None

    key = None
    if bracket_start > 0:
        raw_key = content[:bracket_start].strip()
        key = parse_string_literal(raw_key) if raw_key.startswith(DOUBLE_QUOTE) else raw_key

    after_colon = content[colon_index + 1:].strip()
    bracket_content = content[bracket_start + 1: bracket_end]

    try:
        parsed_bracket = parse_bracket_segment(bracket_content, default_delimiter)
    except Exception:
        return None

    length, delimiter = parsed_bracket['length'], parsed_bracket['delimiter']

    fields = None
    if brace_start != -1 and brace_start < colon_index:
        found_brace_end = content.find(CLOSE_BRACE, brace_start)
        if found_brace_end != -1 and found_brace_end < colon_index:
            fields_content = content[brace_start + 1: found_brace_end]
            fields = [parse_string_literal(field.strip()) for field in parse_delimited_values(fields_content, delimiter)]

    return {
        'header': {
            'key': key,
            'length': length,
            'delimiter': delimiter,
            'fields': fields,
        },
        'inlineValues': after_colon or None,
    }

def parse_bracket_segment(
    seg: str,
    default_delimiter: Delimiter,
) -> Dict[str, Any]:
    content = seg

    delimiter = default_delimiter
    if content.endswith(TAB):
        delimiter = DELIMITERS['tab']
        content = content[:-1]
    elif content.endswith(PIPE):
        delimiter = DELIMITERS['pipe']
        content = content[:-1]

    try:
        length = int(content)
    except ValueError:
        raise TypeError(f"Invalid array length: {seg}")

    return {'length': length, 'delimiter': delimiter}


def parse_delimited_values(input: str, delimiter: Delimiter) -> List[str]:
    values = []
    value_buffer = ''
    in_quotes = False
    i = 0

    while i < len(input):
        char = input[i]

        if char == BACKSLASH and i + 1 < len(input) and in_quotes:
            value_buffer += char + input[i + 1]
            i += 2
            continue

        if char == DOUBLE_QUOTE:
            in_quotes = not in_quotes
            value_buffer += char
            i += 1
            continue

        if char == delimiter and not in_quotes:
            values.append(value_buffer.strip())
            value_buffer = ''
            i += 1
            continue

        value_buffer += char
        i += 1

    if value_buffer or values:
        values.append(value_buffer.strip())

    return values

def map_row_values_to_primitives(values: List[str]) -> List[JsonPrimitive]:
    return [parse_primitive_token(v) for v in values]

# #endregion

# #region Primitive and key parsing

def parse_primitive_token(token: str) -> JsonPrimitive:
    trimmed = token.strip()

    if not trimmed:
        return ''

    if trimmed.startswith(DOUBLE_QUOTE):
        return parse_string_literal(trimmed)

    if isBooleanOrNullLiteral(trimmed):
        if trimmed == TRUE_LITERAL:
            return True
        if trimmed == FALSE_LITERAL:
            return False
        if trimmed == NULL_LITERAL:
            return None

    if isNumericLiteral(trimmed):
        parsed_number = float(trimmed)
        return 0 if parsed_number == -0.0 else parsed_number

    return trimmed

def parse_string_literal(token: str) -> str:
    trimmed_token = token.strip()

    if trimmed_token.startswith(DOUBLE_QUOTE):
        closing_quote_index = findClosingQuote(trimmed_token, 0)
        if closing_quote_index == -1:
            raise SyntaxError('Unterminated string: missing closing quote')
        if closing_quote_index != len(trimmed_token) - 1:
            raise SyntaxError('Unexpected characters after closing quote')
        content = trimmed_token[1:closing_quote_index]
        return unescapeString(content)
    return trimmed_token

def parse_unquoted_key(content: str, start: int) -> Dict[str, Any]:
    parse_position = start
    while parse_position < len(content) and content[parse_position] != COLON:
        parse_position += 1

    if parse_position >= len(content) or content[parse_position] != COLON:
        raise SyntaxError('Missing colon after key')

    key = content[start:parse_position].strip()
    parse_position += 1
    return {'key': key, 'end': parse_position}

def parse_quoted_key(content: str, start: int) -> Dict[str, Any]:
    closing_quote_index = findClosingQuote(content, start)
    if closing_quote_index == -1:
        raise SyntaxError('Unterminated quoted key')
    key_content = content[start + 1:closing_quote_index]
    key = unescapeString(key_content)
    parse_position = closing_quote_index + 1
    if parse_position >= len(content) or content[parse_position] != COLON:
        raise SyntaxError('Missing colon after key')
    parse_position += 1
    return {'key': key, 'end': parse_position}

def parse_key_token(content: str, start: int) -> Dict[str, Any]:
    is_quoted = content[start] == DOUBLE_QUOTE
    result = parse_quoted_key(content, start) if is_quoted else parse_unquoted_key(content, start)
    result['isQuoted'] = is_quoted
    return result


def is_array_header_after_hyphen(content: str) -> bool:
    return content.strip().startswith(OPEN_BRACKET) and findUnquotedChar(content, COLON) != -1

def is_object_first_field_after_hyphen(content: str) -> bool:
    return findUnquotedChar(content, COLON) != -1
