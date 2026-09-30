import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase


class TestExportLookups(SimpleTestCase):
    @patch("api.management.commands.export_lookups.LOOKUP_DEFINITIONS")
    @patch("api.management.commands.export_lookups.call_command")
    def test_passes_lookup_models_to_dumpdata(
        self,
        mock_call_command,
        mock_definitions,
    ):
        mock_definitions.values.return_value = [
            SimpleNamespace(
                model=type(
                    "FakeModel",
                    (),
                    {
                        "_meta": type(
                            "Meta",
                            (),
                            {"label_lower": "api.fake_lookup"},
                        )(),
                    },
                ),
            ),
        ]

        from django.core.management import call_command

        with (
            TemporaryDirectory() as tmpdir,
            patch(
                "api.management.commands.export_lookups.settings.BASE_DIR",
                Path(tmpdir),
            ),
        ):
            call_command(
                "export_lookups",
                output="lookups.json",
            )

        args, kwargs = mock_call_command.call_args

        self.assertEqual(
            args,
            (
                "dumpdata",
                "api.lookupversion",
                "api.lookupconfiguration",
                "api.fake_lookup",
            ),
        )
        self.assertEqual(kwargs["format"], "json")
        self.assertEqual(kwargs["indent"], 2)
        self.assertIn("stdout", kwargs)

    @patch("api.management.commands.export_lookups.LOOKUP_DEFINITIONS", {})
    @patch("api.management.commands.export_lookups.call_command")
    def test_writes_dumpdata_output_as_utf8_json(
        self,
        mock_call_command,
    ):
        def dumpdata(*args, **kwargs):
            kwargs["stdout"].write(
                '[{"model": "api.lookup", '
                '"pk": 1, '
                '"fields": {"name": "Faculty – Test"}}]'
            )

        mock_call_command.side_effect = dumpdata

        from django.core.management import call_command

        with TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "lookups.json"

            with patch(
                "api.management.commands.export_lookups.settings.BASE_DIR",
                Path(tmpdir),
            ):
                call_command(
                    "export_lookups",
                    output="lookups.json",
                )

            data = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(
            data,
            [
                {
                    "model": "api.lookup",
                    "pk": 1,
                    "fields": {"name": "Faculty – Test"},
                }
            ],
        )
