"""
Tests for documentation changes introduced in PR:
- README.md updated with personal backstory and PCB/CAD choices section
- BOM.csv deleted
- SHIP.md deleted
- assets/README.md deleted
- assets/photos/README.md deleted
"""

import os
import unittest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def repo_path(*parts):
    return os.path.join(REPO_ROOT, *parts)


def read_file(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


class TestReadmeExists(unittest.TestCase):
    """README.md must exist and be readable."""

    def test_readme_exists(self):
        self.assertTrue(
            os.path.isfile(repo_path("README.md")),
            "README.md must exist at the repository root",
        )

    def test_readme_not_empty(self):
        content = read_file(repo_path("README.md"))
        self.assertTrue(len(content.strip()) > 0, "README.md must not be empty")


class TestReadmeSections(unittest.TestCase):
    """README.md must contain the two sections introduced by this PR."""

    def setUp(self):
        self.content = read_file(repo_path("README.md"))

    def test_readme_has_about_heading(self):
        self.assertIn(
            "## About",
            self.content,
            "README.md must contain the '## About' heading",
        )

    def test_readme_has_pcb_cad_heading(self):
        self.assertIn(
            "## PCB and CAD choices",
            self.content,
            "README.md must contain the '## PCB and CAD choices' heading",
        )

    def test_readme_has_exactly_two_top_level_sections(self):
        """Regression: only About and PCB and CAD choices headings should be present."""
        h2_lines = [
            line for line in self.content.splitlines() if line.startswith("## ")
        ]
        self.assertEqual(
            len(h2_lines),
            2,
            f"README.md should have exactly 2 top-level (##) sections, found: {h2_lines}",
        )

    def test_readme_sections_are_ordered(self):
        """About section must appear before PCB and CAD choices section."""
        about_pos = self.content.find("## About")
        pcb_pos = self.content.find("## PCB and CAD choices")
        self.assertLess(
            about_pos,
            pcb_pos,
            "'## About' must appear before '## PCB and CAD choices'",
        )


class TestReadmeAboutContent(unittest.TestCase):
    """The About section must contain the personal project backstory added in this PR."""

    def setUp(self):
        self.content = read_file(repo_path("README.md"))

    def test_about_mentions_arcade(self):
        self.assertIn(
            "arcade",
            self.content.lower(),
            "About section must mention the ACTION arcade origin story",
        )

    def test_about_mentions_plants(self):
        self.assertIn(
            "plant",
            self.content.lower(),
            "About section must mention the plant monitoring feature",
        )

    def test_about_mentions_future_plans(self):
        self.assertIn(
            "future",
            self.content.lower(),
            "About section must mention future plans",
        )

    def test_old_single_line_description_removed(self):
        """The old one-liner description must no longer be present."""
        old_description = (
            "A modular ESP32 smart desk — wireless plant monitoring, desk audio, "
            "and an Electron dashboard."
        )
        self.assertNotIn(
            old_description,
            self.content,
            "Old single-line description must have been replaced",
        )


class TestReadmePcbCadContent(unittest.TestCase):
    """The PCB and CAD choices section must contain the design decisions added in this PR."""

    def setUp(self):
        self.content = read_file(repo_path("README.md"))

    def test_pcb_decision_no_pcb(self):
        self.assertIn(
            "pcb",
            self.content.lower(),
            "PCB section must discuss the no-PCB decision",
        )

    def test_pcb_decision_mentions_expansions(self):
        self.assertIn(
            "expan",
            self.content.lower(),
            "PCB section must mention the ability to add expansions as reason for no-PCB",
        )

    def test_cad_mentions_enclosures(self):
        self.assertIn(
            "enclosure",
            self.content.lower(),
            "CAD section must mention enclosures",
        )

    def test_cad_mentions_dimensions(self):
        self.assertIn(
            "dimension",
            self.content.lower(),
            "CAD section must mention waiting for dimensions before designing",
        )


class TestDeletedFiles(unittest.TestCase):
    """Files deleted in this PR must no longer exist in the repository."""

    def test_bom_csv_deleted(self):
        self.assertFalse(
            os.path.isfile(repo_path("BOM.csv")),
            "BOM.csv must have been deleted in this PR",
        )

    def test_ship_md_deleted(self):
        self.assertFalse(
            os.path.isfile(repo_path("SHIP.md")),
            "SHIP.md must have been deleted in this PR",
        )

    def test_assets_readme_deleted(self):
        self.assertFalse(
            os.path.isfile(repo_path("assets", "README.md")),
            "assets/README.md must have been deleted in this PR",
        )

    def test_assets_photos_readme_deleted(self):
        self.assertFalse(
            os.path.isfile(repo_path("assets", "photos", "README.md")),
            "assets/photos/README.md must have been deleted in this PR",
        )

    def test_bom_csv_content_not_in_readme(self):
        """Regression: BOM table data must not have been accidentally moved to README."""
        content = read_file(repo_path("README.md"))
        bom_indicators = ["ESP32-S3 N16R8 Devboard", "INMP441", "DS18B20 waterproof"]
        for indicator in bom_indicators:
            self.assertNotIn(
                indicator,
                content,
                f"BOM entry '{indicator}' must not appear in README.md",
            )

    def test_ship_md_content_not_in_readme(self):
        """Regression: SHIP.md checklist content must not have been accidentally moved to README."""
        content = read_file(repo_path("README.md"))
        ship_indicators = ["Hack Club Ship", "peer voting", "Hackatime"]
        for indicator in ship_indicators:
            self.assertNotIn(
                indicator,
                content,
                f"SHIP.md content '{indicator}' must not appear in README.md",
            )


if __name__ == "__main__":
    unittest.main()
