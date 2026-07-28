import os
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _install_genai_stub():
    """Stub google.generativeai so the service imports without the SDK or an API key."""
    google = sys.modules.setdefault("google", types.ModuleType("google"))
    genai = types.ModuleType("google.generativeai")
    genai.configure = MagicMock()
    genai.GenerativeModel = MagicMock(return_value=MagicMock())
    google.generativeai = genai
    sys.modules["google.generativeai"] = genai


_install_genai_stub()
os.environ.setdefault("GEMINI_API_KEY", "test-key")

import main  # noqa: E402


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture
def generate_content():
    """Replaces the Gemini call, yielding the mock so tests can set its return value."""
    mock = MagicMock()
    original = main.model.generate_content
    main.model.generate_content = mock
    yield mock
    main.model.generate_content = original


def gemini_response(text):
    response = MagicMock()
    response.text = text
    return response
