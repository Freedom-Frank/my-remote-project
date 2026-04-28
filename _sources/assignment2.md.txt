# Assignment 2 — Static Personal Blog Website

**Student Name**: Meng Wang
**Student ID**: ZY2557108

> A walkthrough of how this blog was scaffolded, version-controlled,
> and deployed for Assignment 2 of the *Remote Development* course.

## 1. Tooling Choices

### 1.1 Why Sphinx (instead of Hugo / VuePress)

The course lecture notes recommend Hugo for blogs and Sphinx for
documentation, and offer both as acceptable choices. I chose **Sphinx**
for three concrete reasons:

1. **Coursework alignment.** The in-class exercise walks step-by-step
   through `sphinx-quickstart`, `myst-parser`, and `make html`. Following
   the same toolchain made it possible to follow the official guidance
   verbatim instead of translating each step to Hugo's `front matter`
   conventions.
2. **Markdown-first writing.** With the `myst-parser` extension, every
   `.md` file under `docs-web/source/` becomes a page. The Assignment 1
   report could therefore be reused exactly as written, without any
   format conversion.
3. **Stability over novelty.** Sphinx has a 15-year track record. The
   build behavior is fully deterministic: the same source produces the
   same HTML across machines.

### 1.2 Why Furo (instead of the default Read-the-Docs theme)

Sphinx out of the box ships the `alabaster` theme, which looks like a
1990s reference manual. The course rubric does not score appearance,
but a "personal blog" deserves to feel like one.

I switched to **Furo** because it is:

- Modern: rounded corners, generous whitespace, real dark-mode toggle.
- Fast: a single CSS file, no JavaScript framework dependency.
- Maintained: the author also maintains pip and Sphinx itself, so it
  tracks Sphinx releases closely.

The switch is a one-line change in `conf.py`:
`html_theme = "furo"`.

### 1.3 Why the school GitLab (instead of GitHub / Gitee)

The course Lecture 4 lists four acceptable Git servers: GitHub, GitLab,
Gitee, and the school's internal GitLab at
`http://10.62.192.92:11080/`. I chose the **school GitLab** for two
reasons:

1. **Course alignment.** The course server, the GitLab server, and the
   workstation all live on the same campus network. Using the school
   GitLab keeps every credential, every URL, and every hop inside the
   same network — which is the exact discipline the course is teaching.
2. **No external dependency.** GitHub access can be flaky from a campus
   IP; the school GitLab never has that problem.

The trade-off is that the school GitLab requires an admin to approve
new accounts. I had to email the TA for approval after self-registering;
the account was activated within an hour.

## 2. Initial Setup

### 2.1 Local environment

The project lives in WSL2 Ubuntu 22.04 on a Windows 11 host. A normal
user `meng` was created (with `sudo` access) instead of using `root`,
which mirrors the conventions of the course server at
`10.62.192.91:9991`.

A dedicated `sphinx-env` conda environment isolates the dependencies:

    conda create -n sphinx-env python=3.11 -y
    conda activate sphinx-env
    pip install sphinx myst-parser furo numpy

### 2.2 Sphinx project

The project layout was created with `sphinx-quickstart`, choosing the
"separate source and build directories" option that the course warns
about. The result is the standard layout:

    my-remote-project/
    |-- matrix.py
    |-- README.md
    |-- .gitignore
    `-- docs-web/
        |-- Makefile
        `-- source/
            |-- conf.py
            |-- index.rst
            |-- assignment1.md
            `-- assignment2.md   (this file)

`conf.py` was edited in three places:

- `extensions = ['myst_parser']` to enable Markdown.
- `source_suffix = {'.rst': 'restructuredtext', '.md': 'markdown'}`
  so `.md` files are picked up.
- `html_theme = 'furo'` to switch themes.

## 3. Version Control with Git

### 3.1 Repository

A blank, public project named `my-remote-project` was created on the
school GitLab. Authentication uses an Ed25519 SSH key pair; the public
key is registered under the GitLab user profile. The remote URL is

    ssh://git@10.62.192.92:11022/Meng/my-remote-project.git

(Note the non-standard SSH port 11022.)

### 3.2 Commit history

The project deliberately keeps each commit small and self-explanatory.
Every commit message follows the conventional-commits prefix style
(`init:`, `docs:`, `feat:`, `chore:`).

| # | Hash      | Message                                                                           | Rationale |
|---|-----------|-----------------------------------------------------------------------------------|-----------|
| 1 | 0e20781   | init: scaffold Sphinx blog with Furo theme and add Assignment 1 report            | The initial state — project structure, Furo theme, and the full Assignment 1 deliverable, all in one root commit. |
| 2 | 345f991   | docs: add README with project overview, layout, and build instructions            | A README is the standard repository entry point. Adding it as the second commit makes the GitLab project page self-documenting. |
| 3 | (this)    | docs: add Assignment 2 process write-up                                           | This file. Documents the toolchain choices, the workflow, and the commit history itself. |
| 4 | (later)   | feat: deploy site / chore: add deployment notes                                   | Captures the deployment step described in section 4. |
| 5 | (later)   | chore: final polish before submission                                             | Last-mile cleanup: navigation, links, and any small fixes discovered during final review. |

The `.gitignore` excludes `docs-web/build/`, `__pycache__/`, and
common editor noise. As a result, only source files are tracked — the
generated HTML is rebuilt by every reader who clones the repo, which
is the only way to guarantee that the published site matches the
checked-in source.

## 4. Build & Deploy

### 4.1 Local build

Building the site is a single command:

    cd docs-web
    make html

The output appears in `docs-web/build/html/`. Opening
`build/html/index.html` in a browser shows the site as it will be
served.

### 4.2 Deployment

The site is served from `(deployment URL — to be filled in after
deployment)`. The deployed copy is rebuilt from the same `main` branch
on the school GitLab, so the public site always matches the source of
truth.

## 5. What Worked, What Didn't

A few honest notes for anyone reproducing this setup.

- **MyST is strict about heading levels.** Skipping from `##` to `####`
  triggers a build warning. The fix is just to keep the hierarchy
  contiguous, but it took a few rebuilds to notice.
- **Math blocks inside Markdown break Sphinx unless `dollarmath` is
  enabled.** I removed the LaTeX matrix in Assignment 1 and described
  the result in prose instead, which is clearer anyway.
- **Code fences must be balanced.** A single missing closing fence
  caused everything from that line to the end of the document to be
  rendered as one giant code block. `grep -n '^```' file.md` is the
  fastest way to spot this.
- **Terminal pasting can corrupt heredocs.** Long `cat << EOF` blocks
  occasionally swallowed the `EOF` marker on paste, which left bash
  hanging on `> ` for input. Writing files in an external editor and
  copying them in via `cp /mnt/d/...` avoids the problem entirely.

## 6. References

- Sphinx documentation: <https://www.sphinx-doc.org/>
- Furo theme: <https://pradyunsg.me/furo/>
- MyST parser: <https://myst-parser.readthedocs.io/>
- Course materials, Lecture 4 (Remote Workstation & Git Server)
- Course materials, Lecture 7 (Linux Tools, Remote Workflow, Version Control)
