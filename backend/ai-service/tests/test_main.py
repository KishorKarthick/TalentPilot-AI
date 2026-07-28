import json

import pytest
from conftest import gemini_response

import main

EXTRACTED = {
    "name": "Grace Hopper",
    "email": "grace@example.com",
    "skills": ["cobol"],
    "atsScore": 88,
    "matchScore": 77,
}

MATCH_RESULT = {"matchScore": 85, "atsScore": 78, "matchedSkills": ["cobol"]}

# Characters absent from the prompt templates, so occurrences in a built prompt
# come only from the truncated request payload.
RESUME_FILLER = "\u00e4"
JOB_FILLER = "\u00f6"


class TestCleanJson:
    def test_strips_a_json_markdown_fence(self):
        assert main.clean_json('```json\n{"a": 1}\n```') == '{"a": 1}'

    def test_strips_a_bare_markdown_fence(self):
        assert main.clean_json('```\n{"a": 1}\n```') == '{"a": 1}'

    def test_leaves_plain_json_untouched(self):
        assert main.clean_json('{"a": 1}') == '{"a": 1}'

    def test_trims_surrounding_whitespace(self):
        assert main.clean_json('\n  {"a": 1}  \n') == '{"a": 1}'


class TestHealth:
    def test_reports_the_service_as_ok(self, client):
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "OK", "service": "Smart ATS AI"}


class TestExtract:
    def test_returns_the_parsed_gemini_json(self, client, generate_content):
        generate_content.return_value = gemini_response(json.dumps(EXTRACTED))

        response = client.post("/extract", json={"resume_text": "Grace Hopper, COBOL"})

        assert response.status_code == 200
        assert response.json() == EXTRACTED

    def test_unwraps_a_markdown_fenced_response(self, client, generate_content):
        generate_content.return_value = gemini_response(f"```json\n{json.dumps(EXTRACTED)}\n```")

        response = client.post("/extract", json={"resume_text": "Grace Hopper"})

        assert response.status_code == 200
        assert response.json()["name"] == "Grace Hopper"

    def test_includes_the_job_description_in_the_prompt(self, client, generate_content):
        generate_content.return_value = gemini_response(json.dumps(EXTRACTED))

        client.post(
            "/extract",
            json={"resume_text": "Grace Hopper", "job_description": "COBOL maintainer"},
        )

        prompt = generate_content.call_args[0][0]
        assert "Grace Hopper" in prompt
        assert "COBOL maintainer" in prompt

    def test_marks_a_missing_job_description_as_not_provided(self, client, generate_content):
        generate_content.return_value = gemini_response(json.dumps(EXTRACTED))

        client.post("/extract", json={"resume_text": "Grace Hopper"})

        assert "Not provided" in generate_content.call_args[0][0]

    def test_truncates_long_inputs_before_prompting(self, client, generate_content):
        generate_content.return_value = gemini_response(json.dumps(EXTRACTED))

        client.post(
            "/extract",
            json={"resume_text": RESUME_FILLER * 9000, "job_description": JOB_FILLER * 3000},
        )

        prompt = generate_content.call_args[0][0]
        assert prompt.count(RESUME_FILLER) == 8000
        assert prompt.count(JOB_FILLER) == 2000

    @pytest.mark.parametrize("resume_text", ["", "   \n\t "])
    def test_rejects_blank_resume_text(self, client, generate_content, resume_text):
        response = client.post("/extract", json={"resume_text": resume_text})

        assert response.status_code == 400
        assert response.json()["detail"] == "Resume text is empty"
        generate_content.assert_not_called()

    def test_requires_the_resume_text_field(self, client):
        response = client.post("/extract", json={})

        assert response.status_code == 422

    def test_reports_invalid_json_from_the_model(self, client, generate_content):
        generate_content.return_value = gemini_response("not json at all")

        response = client.post("/extract", json={"resume_text": "Grace Hopper"})

        assert response.status_code == 500
        assert response.json()["detail"] == "AI returned invalid JSON"

    def test_reports_a_model_failure(self, client, generate_content):
        generate_content.side_effect = RuntimeError("quota exceeded")

        response = client.post("/extract", json={"resume_text": "Grace Hopper"})

        assert response.status_code == 500
        assert response.json()["detail"] == "quota exceeded"


class TestMatch:
    def test_scores_a_resume_against_a_job(self, client, generate_content):
        generate_content.return_value = gemini_response(json.dumps(MATCH_RESULT))

        response = client.post(
            "/match",
            json={"resume_text": "Grace Hopper", "job_description": "COBOL maintainer"},
        )

        assert response.status_code == 200
        assert response.json() == MATCH_RESULT

    def test_unwraps_a_markdown_fenced_response(self, client, generate_content):
        generate_content.return_value = gemini_response(f"```\n{json.dumps(MATCH_RESULT)}\n```")

        response = client.post(
            "/match",
            json={"resume_text": "Grace Hopper", "job_description": "COBOL maintainer"},
        )

        assert response.status_code == 200
        assert response.json()["matchScore"] == 85

    def test_truncates_long_inputs_before_prompting(self, client, generate_content):
        generate_content.return_value = gemini_response(json.dumps(MATCH_RESULT))

        client.post(
            "/match",
            json={"resume_text": RESUME_FILLER * 6000, "job_description": JOB_FILLER * 3000},
        )

        prompt = generate_content.call_args[0][0]
        assert prompt.count(RESUME_FILLER) == 5000
        assert prompt.count(JOB_FILLER) == 2000

    def test_requires_a_job_description(self, client, generate_content):
        response = client.post("/match", json={"resume_text": "Grace Hopper"})

        assert response.status_code == 400
        assert response.json()["detail"] == "Job description required"
        generate_content.assert_not_called()

    def test_reports_invalid_json_from_the_model(self, client, generate_content):
        generate_content.return_value = gemini_response("still not json")

        response = client.post(
            "/match",
            json={"resume_text": "Grace Hopper", "job_description": "COBOL"},
        )

        assert response.status_code == 500

    def test_reports_a_model_failure(self, client, generate_content):
        generate_content.side_effect = RuntimeError("upstream unavailable")

        response = client.post(
            "/match",
            json={"resume_text": "Grace Hopper", "job_description": "COBOL"},
        )

        assert response.status_code == 500
        assert response.json()["detail"] == "upstream unavailable"


class TestCors:
    def test_allows_cross_origin_requests(self, client, generate_content):
        generate_content.return_value = gemini_response(json.dumps(EXTRACTED))

        response = client.post(
            "/extract",
            json={"resume_text": "Grace Hopper"},
            headers={"Origin": "http://localhost:3000"},
        )

        assert response.headers["access-control-allow-origin"] == "*"
