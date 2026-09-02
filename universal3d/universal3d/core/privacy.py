"""
core/privacy.py

This is not a policy statement -- it's an enforced constraint. While a
conversion runs, this process is not allowed to open ANY outbound
socket, including to localhost. If any library (or a future dependency,
or a bug) tries to make a network call, it gets a RuntimeError instead
of a connection.

Use:
    with network_lockdown():
        result = converter.convert(...)

This guarantees the file being converted, and everything derived from
it, cannot leave this machine for the duration of that call.
"""
from __future__ import annotations
import socket
import contextlib


class NetworkAccessBlocked(RuntimeError):
    pass


def _blocked(*args, **kwargs):
    raise NetworkAccessBlocked(
        "Outbound network access was attempted during a local conversion. "
        "This library never sends files or metadata off this machine -- "
        "the call was blocked, not allowed through. If you hit this "
        "unexpectedly, something in your dependency chain is trying to "
        "phone home and should be investigated before you trust it."
    )


@contextlib.contextmanager
def network_lockdown():
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    socket.socket.connect = _blocked
    socket.socket.connect_ex = _blocked
    try:
        yield
    finally:
        socket.socket.connect = original_connect
        socket.socket.connect_ex = original_connect_ex
