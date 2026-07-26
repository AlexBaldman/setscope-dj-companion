# GitHub Publishing

## Current State

The repository is connected to:

```text
https://github.com/AlexBaldman/setscope-dj-companion
```

`main` is the release branch. Pushes run the full CI workflow and deploy the static artifact through `.github/workflows/pages.yml`.

The Pages artifact contains only the five public HTML surfaces, browser modules, visual assets, and the readable dev journal. Server code, local data, environment files, tests, and dependencies are not published.

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

## Publish

1. Run `npm run check`, `npm run smoke`, and `npm run test:runtime`.
2. Run `npm run build:pages` to inspect the ignored `dist/` artifact.
3. Commit and push `main`.
4. Watch **SetScope CI** and **Deploy SetScope to GitHub Pages** in GitHub Actions.
5. If Pages has never been enabled, choose **Settings → Pages → Source → GitHub Actions**.

The deployment workflow follows GitHub's custom Pages workflow contract: `configure-pages`, `upload-pages-artifact`, and `deploy-pages`, with the `pages: write` and `id-token: write` permissions required by [GitHub's Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
