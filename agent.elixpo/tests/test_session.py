"""Tests for session persistence."""

import pytest

from elixpo.agent.session import Session, SessionStatus, SessionStore, SessionTrigger
from elixpo.llm.models import Message


@pytest.fixture
def store(tmp_path):
    return SessionStore(str(tmp_path))


def test_save_and_load(store):
    session = Session(trigger=SessionTrigger.CLI)
    session.messages.append(Message(role="system", content="You are helpful."))
    session.messages.append(Message(role="user", content="Hello"))

    store.save(session)

    loaded = store.load(session.id)
    assert loaded is not None
    assert loaded.id == session.id
    assert loaded.trigger == SessionTrigger.CLI
    assert len(loaded.messages) == 2
    assert loaded.messages[0].content == "You are helpful."
    assert loaded.messages[1].content == "Hello"


def test_list_sessions(store):
    for i in range(3):
        s = Session(trigger=SessionTrigger.CLI)
        store.save(s)

    sessions = store.list_sessions()
    assert len(sessions) == 3


def test_delete_session(store):
    session = Session(trigger=SessionTrigger.CLI)
    store.save(session)
    assert store.load(session.id) is not None

    store.delete(session.id)
    assert store.load(session.id) is None


def test_incremental_message_append(store):
    session = Session(trigger=SessionTrigger.CLI)
    session.messages.append(Message(role="user", content="msg1"))
    store.save(session)

    session.messages.append(Message(role="assistant", content="msg2"))
    store.save(session)

    loaded = store.load(session.id)
    assert len(loaded.messages) == 2
