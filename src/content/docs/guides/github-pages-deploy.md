---
title: Deploying to GitHub Pages
description: How to deploy this Astro Starlight site to GitHub Pages, including the custom-domain-plus-subpath setup this repo actually uses.
---

This project deploys to GitHub Pages via GitHub Actions. This page walks through the setup and flags a couple of `site`/`base` combinations that are easy to get wrong — including the one this repo needs.

For the canonical, fully general reference, see the official [Astro: Deploy your Site to GitHub Pages](https://docs.astro.build/en/guides/deploy/github/) guide. This page exists because that guide's `site`/`base` walkthrough assumes a simpler setup than ours; the differences are called out below.

## The workflow

`.github/workflows/deploy.yml` uses the official [`withastro/action`](https://github.com/withastro/action) to install, build, and upload the site, then `actions/deploy-pages` to publish it:

```yaml title=".github/workflows/deploy.yml"
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout your repository using git
        uses: actions/checkout@v7
      - name: Install, build, and upload your site
        uses: withastro/action@v6

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

The action auto-detects your package manager from whichever lockfile is committed (`package-lock.json`, `pnpm-lock.yaml`, etc.) — make sure that lockfile is checked in. In the repo's **Settings → Pages**, the source must be set to **GitHub Actions** for this workflow to actually publish anything.

## `site` and `base`: the combination that matters here

Astro's own guide walks through two setups as if they were the only two options:

1. **Plain GitHub subpath** — `site: 'https://<username>.github.io'` plus `base: '/<repo-name>'`, publishing at `https://<username>.github.io/<repo-name>/`.
2. **Custom domain** — `site` becomes the custom domain, and `base` is removed entirely, because the assumption is that a custom domain always means the site is served from the domain root.

**Neither of those is quite our setup.** This repo (`QnD`) is a project repository on an account where the *user/organization* site (`dagilleland.github.io`) already owns the custom domain `gilleland.ca`. GitHub Pages still publishes project repos under that domain as a subpath — `https://gilleland.ca/QnD/` — the custom domain replaces the `<username>.github.io` host, but it does **not** collapse the `/repo-name/` path the way it would if this repo itself were the root/user site.

So the config that actually works here combines both halves that the docs guide treats as mutually exclusive:

```js title="astro.config.mjs"
export default defineConfig({
  site: 'https://gilleland.ca/',
  base: '/QnD',
});
```

If you're setting this up for a repo of your own, the rule of thumb is: **`base` is about whether this repo's own site lives at a subpath, and `site` is about which host it's reached at — they're independent questions.** A custom domain only lets you drop `base` if the custom domain was configured on *this* repo and this repo is meant to serve from the domain root. If another repo on the same account owns that domain and this one is just riding along under it, keep `base`.

## Case sensitivity

`base` must match your repository name's exact case (`/QnD`, not `/qnd`). GitHub Pages serves from Linux, which treats paths case-sensitively; Windows and macOS filesystems don't, so a case mismatch can build and even preview correctly on your local machine while producing broken asset/stylesheet links on the live site. Neither the official guide nor Astro's config reference calls this out explicitly — it only surfaces once you've deployed and something 404s that worked locally.

## Internal links: what actually needs the `base` prefix

The official guide's instruction — *"all of your internal page links must be prefixed with your `base` value"* — is true, but it undersells an important distinction: **not everything that produces a link needs you to add the prefix by hand.**

- **Framework/integration-resolved links already get `base` applied for you.** In this Starlight site, sidebar entries defined with `slug` (or `autogenerate`) are resolved against the content collection and have `base` prepended automatically. Writing `slug: 'guides/example'` is correct; writing `slug: 'QnD/guides/example'` will actually break the build, because `slug` is a content-collection lookup key, not a URL — Starlight looks for a page whose slug literally starts with `QnD/`, finds nothing, and throws.
- **Literal, hand-written hrefs do need the manual prefix**, because nothing rewrites them for you. That includes absolute-path links you type directly in Markdown (e.g. `[guides](/QnD/guides/example)`) and Starlight's homepage hero `actions[].link` in frontmatter, which is passed through as a raw string.

When in doubt: if a link comes from a config field that understands your content collection (like sidebar `slug`), leave the base out. If it's a plain string you typed by hand, add `/QnD` yourself.

## Custom domain setup

1. [Configure DNS for your domain provider](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-a-subdomain) — done once, on whichever repo owns the domain in GitHub's Pages settings (in our case, `dagilleland.github.io`, not this repo).
2. That owning repo needs a `public/CNAME` file containing the domain.
3. This repo doesn't need its own `CNAME` file — it inherits the domain from the account's Pages configuration and continues to publish at `/QnD/` beneath it.
