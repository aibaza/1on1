# Wiki Sync

The wiki source of truth lives in `docs/wiki/` within the main repository. Changes should be made there and then synced to the GitHub Wiki.

## Automatic sync (GitHub Actions)

The `sync-wiki` workflow (`.github/workflows/sync-wiki.yml`) runs automatically on every push to `main` that modifies `docs/wiki/**`. It can also be triggered manually from the Actions tab.

## Manual sync (local script)

```bash
./scripts/sync-wiki.sh
```

## First-time setup

GitHub requires the first wiki page to be created via the web UI before the wiki git repo exists. This is a one-time step:

1. Go to https://github.com/dobrician/1on1/wiki
2. Click **Create the first page**
3. Click **Save page**
4. Trigger the `sync-wiki` workflow from the Actions tab (or run `./scripts/sync-wiki.sh`)

## When to sync

- After any changes to `docs/wiki/*.md` files
- After creating new wiki pages
- After updating sprint status or content

## Notes

- The `_Sidebar.md` file controls GitHub Wiki sidebar navigation
- GitHub Wiki treats `Home.md` as the landing page
- Wiki page links use `[[Page-Name]]` syntax
- File names with hyphens display as spaces in GitHub Wiki titles
