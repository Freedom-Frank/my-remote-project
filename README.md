# my-remote-project

Personal study blog and project portfolio for the Remote Development
course at Beihang University (Hangzhou International Campus).

The site is built with Sphinx (https://www.sphinx-doc.org/) and the
Furo (https://pradyunsg.me/furo/) theme. It is hosted on the school
GitLab server at http://10.62.192.92:11080/Meng/my-remote-project

## Repository Layout

- matrix.py            Three matrix-multiplication implementations (Assignment 1)
- docs-web/            Sphinx documentation source
  - Makefile           Run "make html" to build the site
  - source/conf.py     Sphinx configuration (Furo + MyST)
  - source/index.rst   Site homepage
  - source/assignment1.md  Assignment 1 report
- .gitignore           Excludes build/ and editor noise
- README.md            This file

## Local Development

The project uses a dedicated sphinx-env conda environment.

    conda activate sphinx-env
    cd docs-web
    make html

The script matrix.py can be run independently:

    python matrix.py

It prints results from three independent implementations and runs a
three-test correctness verification suite.

## Author

Meng Wang (ZY2557108) - Beihang University, M.Eng in Electronic Information.
