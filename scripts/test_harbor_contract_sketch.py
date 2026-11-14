#!/usr/bin/env python3
"""Gate the harbor NEAR contract sketch: pinned deps, no secrets in deploy script."""

from __future__ import annotations

import os
import pathlib
import re
import shutil
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CARGO = ROOT / "contract" / "harbor-market" / "Cargo.toml"
DEPLOY = ROOT / "scripts" / "deploy_harbor_testnet.sh"
LIB = ROOT / "contract" / "harbor-market" / "src" / "lib.rs"
NEP245 = ROOT / "src" / "harbor" / "near" / "nep245.js"
CONTRACT_DIR = ROOT / "contract" / "harbor-market"


class HarborContractSketchTests(unittest.TestCase):
    def test_cargo_pins_near_sdk(self):
        text = CARGO.read_text(encoding="utf-8")
        self.assertIn('version = "=5.5.0"', text)
        self.assertIn("legacy", text)
        self.assertIn('near-sys = "=0.2.6"', text)

    def test_deploy_script_refuses_mainnet_and_secrets(self):
        text = DEPLOY.read_text(encoding="utf-8")
        self.assertIn("testnet-only", text)
        self.assertNotRegex(text, re.compile(r"ed25519:|PRIVATE_KEY\s*=", re.I))
        self.assertNotIn("BEGIN PRIVATE KEY", text)

    def test_contract_has_record_settlement(self):
        text = LIB.read_text(encoding="utf-8")
        self.assertIn("record_settlement", text)
        self.assertIn("balance_of", text)
        self.assertIn("ft_transfer", text)
        self.assertIn("credit_balance", text)

    def test_token_ids_align_with_nep245_js(self):
        js = NEP245.read_text(encoding="utf-8")
        rust = LIB.read_text(encoding="utf-8")
        for token in ("harbor-coin", "harbor-iron", "harbor-timber", "harbor-canvas"):
            self.assertIn(token, js, msg=f"missing {token} in nep245.js")
            self.assertIn(token, rust, msg=f"missing {token} in contract lib.rs")

    def test_cargo_unit_tests_when_available(self):
        if shutil.which("cargo") is None:
            self.skipTest("cargo not installed")
        proc = subprocess.run(
            ["cargo", "test", "--quiet", "--offline", "--locked"],
            cwd=CONTRACT_DIR,
            capture_output=True,
            text=True,
            timeout=300,
        )
        combined = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode != 0:
            offline_markers = (
                "failed to fetch",
                "failed to download",
                "attempted to resolve with only",
                "could not find",
                "no matching package",
                "network disabled",
                "Unable to update registry",
                "can't find",
            )
            if any(m.lower() in combined.lower() for m in offline_markers):
                self.skipTest("cargo test --offline --locked: dependency cache miss")
            if "requires rustc" in combined:
                self.skipTest("rustc too old for locked near-sdk graph")
            self.fail(combined)

    def test_cargo_wasm_check_when_available(self):
        if os.environ.get("HARBOR_CARGO_CHECK") != "1":
            self.skipTest(
                "HARBOR_CARGO_CHECK=1 not set (opt-in offline cargo check; default skip avoids crates.io in CI)"
            )
        if shutil.which("cargo") is None:
            self.skipTest("cargo not installed")
        proc = subprocess.run(
            [
                "cargo",
                "check",
                "--offline",
                "--locked",
                "--target",
                "wasm32-unknown-unknown",
                "--quiet",
            ],
            cwd=CONTRACT_DIR,
            capture_output=True,
            text=True,
            timeout=300,
        )
        combined = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode != 0:
            offline_markers = (
                "failed to fetch",
                "failed to download",
                "attempted to resolve with only",
                "could not find",
                "no matching package",
                "network disabled",
                "Unable to update registry",
                "can't find",
            )
            if any(m.lower() in combined.lower() for m in offline_markers):
                self.skipTest(
                    "cargo --offline --locked: dependency cache miss (populate with "
                    "network, then re-run with HARBOR_CARGO_CHECK=1)"
                )
            if "edition2024" in combined or "failed to parse manifest" in combined:
                self.skipTest("cargo toolchain too old for near-sdk lockfile")
            if "requires rustc" in combined and "near-sys" in combined:
                self.fail(combined)
            if "requires rustc" in combined:
                self.skipTest("rustc too old for locked near-sdk graph")
            self.fail(combined)


if __name__ == "__main__":
    unittest.main()
