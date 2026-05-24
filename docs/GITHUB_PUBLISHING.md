# GitHub Publishing

## Current State

The SetScope folder is already a local git repository.

Current branch:

```bash
main
```

Current commits:

```bash
aa1bb8e Add recognition HUD creative direction
7e71e44 Initial SetScope prototype
```

## Fixing GitHub CLI Auth

If GitHub CLI asks:

```text
What is your preferred protocol for Git operations on this host?
> HTTPS
  SSH
```

Choose `HTTPS` and press Enter.

To skip that prompt, run:

```bash
/opt/homebrew/Cellar/gh/2.92.0/bin/gh auth login -h github.com --git-protocol https -w
```

Then finish the browser/device-code flow. When it works, this should pass:

```bash
/opt/homebrew/Cellar/gh/2.92.0/bin/gh auth status
```

## Create And Push Repo

After auth is healthy:

```bash
/opt/homebrew/Cellar/gh/2.92.0/bin/gh repo create setscope-dj-companion --private --source=. --remote=origin --push
```

Use `--public` instead of `--private` if the repo should be public.

If the repo already exists:

```bash
git remote add origin git@github.com:AlexBaldman/setscope-dj-companion.git
git push -u origin main
```

Use the HTTPS remote instead if preferred:

```bash
git remote add origin https://github.com/AlexBaldman/setscope-dj-companion.git
git push -u origin main
```
