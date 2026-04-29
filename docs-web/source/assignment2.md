# Assignment 2 — Static Personal Blog Website

**Student Name**: Meng Wang
**Student ID**: ZY2557108

> A walkthrough of how this blog was scaffolded, version-controlled,
> and deployed for Assignment 2 of the *Remote Development* course.
>
> **Live site**: <https://freedom-frank.github.io/my-remote-project/>
>
> *Note*: The GitHub account `Freedom-Frank` is my personal account.

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

### 1.3 Why the school GitLab as the primary remote

The course Lecture 4 lists four acceptable Git servers: GitHub, GitLab,
Gitee, and the school's internal GitLab at
`http://10.62.192.92:11080/`. I chose the **school GitLab** as the
primary remote (`origin`) for two reasons:

1. **Course alignment.** The course server, the GitLab server, and the
   workstation all live on the same campus network. Using the school
   GitLab keeps every credential, every URL, and every hop inside the
   same network — which is the exact discipline the course is teaching.
2. **No external dependency.** GitHub access can be flaky from a campus
   IP; the school GitLab never has that problem.

The trade-off is that the school GitLab requires an admin to approve
new accounts. I had to email the TA for approval after self-registering;
the account was activated within an hour.

A second remote (`github`) was later added for **deployment only** —
see section 4.

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

### 3.1 Repositories

Two remotes are configured for this project:

| Remote   | Role          | URL                                                              |
|----------|---------------|------------------------------------------------------------------|
| `origin` | Source of truth | `ssh://git@10.62.192.92:11022/Meng/my-remote-project.git`     |
| `github` | Deployment    | `https://github.com/Freedom-Frank/my-remote-project.git`         |

The school GitLab is the **primary** remote. Authentication uses an
Ed25519 SSH key pair; the public key is registered under both Git
servers.

### 3.2 Commit history

The project deliberately keeps each commit small and self-explanatory.
Every commit message follows the conventional-commits prefix style
(`init:`, `docs:`, `feat:`, `chore:`, `deploy:`).

| # | Hash      | Branch    | Message                                                                | Rationale |
|---|-----------|-----------|------------------------------------------------------------------------|-----------|
| 1 | 0e20781   | main      | init: scaffold Sphinx blog with Furo theme and add Assignment 1 report | The initial state — project structure, Furo theme, and the full Assignment 1 deliverable, all in one root commit. |
| 2 | 345f991   | main      | docs: add README with project overview, layout, and build instructions | A README is the standard repository entry point. Adding it as the second commit makes the GitLab project page self-documenting. |
| 3 | 7c8133f   | main      | docs: add Assignment 2 process write-up                                | The first version of this file. Documents the toolchain choices and the workflow. |
| 4 | (sep.)    | gh-pages  | deploy: GitHub Pages build snapshot                                    | A separate orphan branch that holds only the rendered HTML. Keeps `main` clean while still letting GitHub Pages serve the site. |
| 5 | (this)    | main      | docs: finalize Assignment 2 with deployment URL and notes              | This commit. Captures the final deployment URL, the dual-remote setup, and the lessons learned. |

The `.gitignore` excludes `docs-web/build/`, `__pycache__/`, and
common editor noise. As a result, only source files are tracked on
`main` — the generated HTML lives only on the `gh-pages` branch and
is rebuilt from source whenever `main` changes.

## 4. Build & Deploy

### 4.1 Local build

Building the site is a single command:

    cd docs-web
    make html

The output appears in `docs-web/build/html/`. Opening
`build/html/index.html` in a browser shows the site exactly as it will
be served.

### 4.2 Deployment attempts

Two deployment paths were attempted, in order:

#### 4.2.1 Course server + `python -m http.server` (rejected)

The first attempt was to host the site on the course workstation at
`10.62.192.91`:

    scp -P 9991 -r docs-web/build/html zy2557108@10.62.192.91:~/public_html
    ssh -p 9991 zy2557108@10.62.192.91
    cd ~/public_html && python -m http.server 8000

The upload and the local server both worked, but external access to
port 8000 was blocked — the campus network only whitelists the SSH
port (9991). Even with the firewall question set aside, this approach
has a deeper problem: the HTTP server only stays up for as long as the
SSH session does. Logging out kills the site. For a site that needs
to be reviewable at the grader's convenience, this is unacceptable.

#### 4.2.2 GitHub Pages (adopted)

The chosen deployment is **GitHub Pages**, served from a dedicated
`gh-pages` branch:

    # build a fresh snapshot
    cd docs-web && make html && cd ..

    # archive the build, then create an orphan branch with no history
    tar -czf /tmp/sphinx-build.tar.gz -C docs-web/build/html .
    git checkout --orphan gh-pages
    git rm -rf .
    tar -xzf /tmp/sphinx-build.tar.gz
    touch .nojekyll                    # disable Jekyll processing
    git add .
    git commit -m "deploy: GitHub Pages build snapshot"
    git push github gh-pages
    git checkout main                  # back to source-of-truth branch

In the GitHub repository settings, **Pages → Source** is set to
*Deploy from a branch*, **Branch** to `gh-pages`, **Folder** to
`/ (root)`. GitHub then builds and serves the site automatically.

The `.nojekyll` file is essential: without it, GitHub's Jekyll layer
silently strips every directory whose name begins with an underscore,
which would break Sphinx's `_static/` and `_sources/`.

### 4.3 Live URL

The site is live at:

<https://freedom-frank.github.io/my-remote-project/>

It is reachable from anywhere on the public internet, does not depend
on any locally running process, and is rebuilt-and-redeployed on every
push to the `gh-pages` branch.

### 4.4 Working through the campus network

A practical note for anyone reproducing this on a campus IP. Direct
`git push` to GitHub from inside WSL2 hung indefinitely — the SSH
handshake to `github.com:22` simply did not complete. The fix has two
parts:

1. **WSL2 mirrored networking** lets WSL share the Windows network
   stack, so `127.0.0.1:7890` inside WSL reaches the proxy listening
   on the Windows host.
2. **Per-host git proxy** sends only GitHub traffic through the proxy,
   leaving traffic to the school GitLab untouched:

       git config --global http.https://github.com.proxy http://127.0.0.1:7890
       git config --global https.https://github.com.proxy http://127.0.0.1:7890

Authentication to GitHub uses a Personal Access Token (PAT) with the
`repo` scope, cached locally via `git config --global credential.helper store`.

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
  copying them in via `cp /mnt/c/.../file.md` avoids the problem.
- **`Allow LAN` in Clash Verge does not bind IPv4 by default.** Even
  with the toggle on, the proxy listened only on `::` (IPv6 wildcard),
  not on `0.0.0.0`. WSL2's mirrored networking saved the day —
  `127.0.0.1` from inside WSL reaches the same loopback interface as
  Windows, so no further configuration was needed.
- **GitHub PATs replace passwords for HTTPS push.** Plain GitHub
  passwords have not been accepted for git operations since 2021;
  `git push` over HTTPS now requires a PAT or SSH.

## 6. References

- Sphinx documentation: <https://www.sphinx-doc.org/>
- Furo theme: <https://pradyunsg.me/furo/>
- MyST parser: <https://myst-parser.readthedocs.io/>
- GitHub Pages documentation: <https://docs.github.com/en/pages>
- Course materials, Lecture 4 (Remote Workstation & Git Server)
- Course materials, Lecture 7 (Linux Tools, Remote Workflow, Version Control)
