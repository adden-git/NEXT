"""Fast JSON serialization with orjson fallback to stdlib json."""

try:
    import orjson
except ImportError:  # pragma: no cover
    orjson = None  # type: ignore[assignment]

if orjson is not None:
    _OPT_NON_STR_KEYS = getattr(orjson, "OPT_NON_STR_KEYS", 0)
    _OPT_ENSURE_ASCII = getattr(orjson, "OPT_ENSURE_ASCII", 0)

    def dumps(obj, *, ensure_ascii=False, default=None, **kwargs) -> str:
        """Serialize obj to a JSON formatted str."""
        option = _OPT_NON_STR_KEYS
        if ensure_ascii:
            option |= _OPT_ENSURE_ASCII
        return orjson.dumps(obj, default=default, option=option).decode("utf-8")

    def loads(s, **kwargs):
        """Deserialize s to a Python object."""
        return orjson.loads(s)

    JSONDecodeError = orjson.JSONDecodeError

else:
    import json as _json

    def dumps(obj, *, ensure_ascii=False, default=None, **kwargs) -> str:
        """Serialize obj to a JSON formatted str."""
        return _json.dumps(obj, ensure_ascii=ensure_ascii, default=default, **kwargs)

    def loads(s, **kwargs):
        """Deserialize s to a Python object."""
        return _json.loads(s, **kwargs)

    JSONDecodeError = _json.JSONDecodeError


class _JsonModule:
    """Namespace object mimicking the stdlib json module API."""

json = _JsonModule()
json.dumps = dumps
json.loads = loads
json.JSONDecodeError = JSONDecodeError
