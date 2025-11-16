from constants import COMMA, LIST_ITEM_MARKER
from literal_utils import isBooleanOrNullLiteral
import re


def isValidUnquotedKey(key: str) -> bool:
      return re.match(r'^[A-Z_][\w.]*$', key, re.IGNORECASE) is not None


def isNumericLike(value: str) -> bool:
      return (re.match(r'^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$', value, re.IGNORECASE) is not None or 
                  re.match(r'^0\d+$', value) is not None)


def isSafeUnquoted(value: str, delimiter: str = COMMA) -> bool:
      if not value:
            return False
      
      if value != value.strip():
            return False
      
      if isBooleanOrNullLiteral(value) or isNumericLike(value):
            return False
      
      if ':' in value:
            return False
      
      if '"' in value or '\\' in value:
            return False
      
      if re.search(r'[\[\]{}]', value):
            return False
      
      if re.search(r'[\n\r\t]', value):
            return False
      
      if delimiter in value:
            return False
      
      if value.startswith(LIST_ITEM_MARKER):
            return False
      
      return True
