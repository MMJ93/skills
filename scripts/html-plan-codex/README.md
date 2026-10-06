# HTML Plan for Codex installer

Install a pinned, local Codex adaptation of Thariq Shihipar's `html-plan`.
This is an unofficial installer, not an OpenAI or Anthropic plugin.
Publishing this code does not install anything on your computer.

## Install

Use a checkout of this repository. Keep the launcher and `installer.mjs` together;
the repository launcher is not the standalone download from the original chat.
Node.js 20 or newer and access to GitHub are required. No npm packages, API keys,
`sudo`, or Claude account are needed by the installer.

From the repository root:

```sh
bash scripts/html-plan-codex/install-html-plan-codex.command --open-example
```

The default destination is `~/.agents/skills/html-plan-codex/`. After installation,
use this in Codex:

```text
$html-plan-codex Plan this change. Do not implement it yet.
```

Restart Codex if the skill is not visible. Review the HTML page in a browser,
press **Respond**, copy the reply into Codex, and explicitly approve implementation.
The skill uses explicit invocation only. The upstream English interface is preserved.

## Options

| Option | Result |
| --- | --- |
| `--dry-run` | Download, adapt, and smoke-test in a temporary directory without installing. |
| `--open-example` | Open the packed example after installation on macOS. |
| `--dest DIRECTORY` | Set an explicit install directory. |
| `--help` | Print usage without downloading or installing. |

## Checks

From the repository root:

```sh
node --test scripts/html-plan-codex/tests/installer.test.mjs
bash -n scripts/html-plan-codex/install-html-plan-codex.command
bash scripts/html-plan-codex/install-html-plan-codex.command --help
bash scripts/html-plan-codex/install-html-plan-codex.command --dry-run
```

The 18 installer unit tests passed on Node.js 22.16.0 during upload preparation.
They test adaptation fixtures, checksums, argument parsing, and file protection;
they do not prove a full Codex or browser workflow.

The installer downloads six pinned upstream files, verifies their Git blob IDs,
then runs syntax, parser, packer, self-contained-output, and invalid-input checks.
Installation proceeds only after those checks pass. Upstream runtime tests,
browser interaction, and a live Codex invocation were not completed during upload
preparation. The repository-wide `make check` also remains unverified here because
Bun is unavailable in the preparation environment.

## Safety and scope

The installer does not change Codex configuration, project files, or other skills.
It refuses an existing or modified destination instead of overwriting it. An
unchanged installation of the same version is a no-op. For an intentional reinstall,
first move the existing skill outside skill discovery folders.

Temporary downloads are removed on success and failure. No service or automatic
updater is installed. Plans stay local unless you separately choose to share them.
Do not publish plans that contain private source code.

This folder contains installer sources, not a directly discoverable `SKILL.md`.
Run the installer rather than trying to install this folder with a skills CLI.
Generated validation logs and downloaded upstream runtime files are not committed.

## Upstream

- Author: Thariq Shihipar.
- Repository: https://github.com/anthropics/claude-plugins-community
- Commit: `f60f0454df3045f724c43c6346ec80bdcc3472b2`.
- Directory: `html-plan/skills/html-plan`.
- Installer version: `0.1.0`.

The runtime is downloaded from upstream and preserved byte-for-byte. Only the skill
instructions are adapted; Codex metadata, provenance, and a CommonJS scope marker
are added. Upstream files retain their notices and remain subject to upstream terms.
