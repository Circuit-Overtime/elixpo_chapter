from constants import BACKSLASH, CARRIAGE_RETURN, DOUBLE_QUOTE, NEWLINE, TAB


def escapeString(value: str) -> str:
    return (
        value.replace(BACKSLASH, BACKSLASH + BACKSLASH)
        .replace(DOUBLE_QUOTE, BACKSLASH + DOUBLE_QUOTE)
        .replace('\n', BACKSLASH + 'n')
        .replace('\r', BACKSLASH + 'r')
        .replace('\t', BACKSLASH + 't')
    )


def unescapeString(value: str) -> str:
    result = ''
    i = 0

    while i < len(value):
        if value[i] == BACKSLASH:
            if i + 1 >= len(value):
                raise SyntaxError('Invalid escape sequence: backslash at end of string')

            next_char = value[i + 1]
            if next_char == 'n':
                result += NEWLINE
                i += 2
                continue
            if next_char == 't':
                result += TAB
                i += 2
                continue
            if next_char == 'r':
                result += CARRIAGE_RETURN
                i += 2
                continue
            if next_char == BACKSLASH:
                result += BACKSLASH
                i += 2
                continue
            if next_char == DOUBLE_QUOTE:
                result += DOUBLE_QUOTE
                i += 2
                continue

            raise SyntaxError(f'Invalid escape sequence: \\{next_char}')

        result += value[i]
        i += 1

    return result


def findClosingQuote(content: str, start: int) -> int:
    i = start + 1
    while i < len(content):
        if content[i] == BACKSLASH and i + 1 < len(content):
            i += 2
            continue
        if content[i] == DOUBLE_QUOTE:
            return i
        i += 1
    return -1


def findUnquotedChar(content: str, char: str, start: int = 0) -> int:
    inQuotes = False
    i = start

    while i < len(content):
        if content[i] == BACKSLASH and i + 1 < len(content) and inQuotes:
            i += 2
            continue

        if content[i] == DOUBLE_QUOTE:
            inQuotes = not inQuotes
            i += 1
            continue

        if content[i] == char and not inQuotes:
            return i

        i += 1

    return -1