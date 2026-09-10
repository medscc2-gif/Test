import json
import unittest
from datetime import datetime
from pathlib import Path

from sling_ical.client import date_windows, parse_date_arg
from sling_ical.ical import build_ics, event_to_vevent


FIXTURES = Path(__file__).parent / "fixtures"


class DateWindowTests(unittest.TestCase):
    def test_chunks_respect_eight_week_cap(self):
        start = datetime(2026, 1, 1)
        end = datetime(2026, 5, 1)
        windows = list(date_windows(start, end))
        self.assertGreaterEqual(len(windows), 2)
        for a, b in windows:
            self.assertLessEqual((b - a).days, 56)
        self.assertEqual(windows[0][0], start)
        self.assertEqual(windows[-1][1], end)

    def test_parse_date_arg(self):
        self.assertEqual(parse_date_arg("2026-09-10"), datetime(2026, 9, 10))
        self.assertEqual(
            parse_date_arg("2026-09-10T15:30:00Z").hour,
            15,
        )


class IcalTests(unittest.TestCase):
    def test_build_ics_from_fixture(self):
        payload = json.loads((FIXTURES / "sample_events.json").read_text(encoding="utf-8"))
        ics = build_ics(payload["events"], calendar_name="Sling Test")
        self.assertIn("BEGIN:VCALENDAR", ics)
        self.assertIn("END:VCALENDAR", ics)
        self.assertIn("BEGIN:VEVENT", ics)
        self.assertIn("SUMMARY:Opening Shift", ics)
        self.assertIn("SUMMARY:Closing", ics)
        self.assertIn("LOCATION:Downtown", ics)
        self.assertIn("DTSTART:20260911T080000", ics)
        self.assertIn("DTSTART:20260912T160000Z", ics)
        self.assertIn("X-WR-CALNAME:Sling Test", ics)
        # RFC 5545 uses CRLF
        self.assertIn("\r\n", ics)

    def test_skips_events_without_start(self):
        self.assertIsNone(event_to_vevent({"id": 1, "summary": "Nope"}))


class CliDemoTests(unittest.TestCase):
    def test_demo_export(self):
        from sling_ical.cli import main
        import tempfile
        from pathlib import Path as P

        with tempfile.TemporaryDirectory() as tmp:
            out = P(tmp) / "demo.ics"
            code = main(["--demo", "-o", str(out)])
            self.assertEqual(code, 0)
            text = out.read_text(encoding="utf-8")
            self.assertIn("SUMMARY:Front Desk", text)
            self.assertIn("BEGIN:VCALENDAR", text)


if __name__ == "__main__":
    unittest.main()
