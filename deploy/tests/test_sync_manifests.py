"""Deployment regressions; run with python3 -m unittest discover -s deploy/tests."""

from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "deploy" / "sync-manifests.sh"


class SyncManifestsTests(unittest.TestCase):
    def test_copies_current_manifests_without_touching_secret(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source"
            target = Path(directory) / "target"
            source.mkdir()
            target.mkdir()
            (source / "02-configmap-api.yaml").write_text("new subnet\n")
            (source / "01-secrets.yaml").write_text("placeholder\n")
            (target / "02-configmap-api.yaml").write_text("old subnet\n")
            secret = target / "01-secrets.yaml"
            secret.write_text("preserve runtime secret\n")
            result = subprocess.run(
                ["bash", str(SCRIPT), str(source), str(target)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((target / "02-configmap-api.yaml").read_text(), "new subnet\n")
            self.assertEqual(secret.read_text(), "preserve runtime secret\n")

    def test_rejects_extra_manifest_before_copying(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source"
            target = Path(directory) / "target"
            source.mkdir()
            target.mkdir()
            (source / "02-configmap-api.yaml").write_text("new\n")
            (target / "02-configmap-api.yaml").write_text("old\n")
            (target / "99-obsolete.yaml").write_text("obsolete\n")
            result = subprocess.run(
                ["bash", str(SCRIPT), str(source), str(target)],
                capture_output=True, text=True, check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Unexpected manifest", result.stderr)
            self.assertEqual((target / "02-configmap-api.yaml").read_text(), "old\n")

    def test_rejects_symlink_without_modifying_its_target(self):
        for symlink_location in ("source", "target", "directory"):
            with self.subTest(location=symlink_location), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                source = root / "source"
                target = root / "target"
                source.mkdir()
                target.mkdir()
                name = "02-configmap-api.yaml"
                outside = root / "outside.yaml"
                outside.write_text("untouched\n")
                (source / name).write_text("new\n")
                if symlink_location == "directory":
                    link = root / "linked-target"
                    link.symlink_to(target, target_is_directory=True)
                    target = link
                else:
                    link = (source if symlink_location == "source" else target) / name
                    if link.exists():
                        link.unlink()
                    link.symlink_to(outside)
                result = subprocess.run(
                    ["bash", str(SCRIPT), str(source), str(target)],
                    capture_output=True, text=True, check=False,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(outside.read_text(), "untouched\n")

    def test_rejects_empty_source(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source"
            target = Path(directory) / "target"
            source.mkdir()
            target.mkdir()
            result = subprocess.run(
                ["bash", str(SCRIPT), str(source), str(target)],
                capture_output=True, text=True, check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("No nonsecret manifests", result.stderr)

    def test_missing_directory_does_not_create_it(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "missing"
            result = subprocess.run(
                ["bash", str(SCRIPT), directory, str(missing)],
                capture_output=True, text=True, check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(missing.exists())


if __name__ == "__main__":
    unittest.main()
