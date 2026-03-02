# Wiki Sync

The wiki source of truth lives in `docs/wiki/` within the main repository. Changes should be made there and then synced to the GitHub Wiki.

## Sync from repo to GitHub Wiki

```bash
# Clone the GitHub Wiki repo (first time only)
git clone https://github.com/dobrician/1on1.wiki.git /tmp/1on1-wiki

# Copy wiki content
cp docs/wiki/*.md /tmp/1on1-wiki/

# Commit and push
cd /tmp/1on1-wiki
git add -A
git commit -m "Sync wiki from main repo"
git push

# Clean up
rm -rf /tmp/1on1-wiki
```

## One-liner sync

```bash
git clone https://github.com/dobrician/1on1.wiki.git /tmp/1on1-wiki && cp docs/wiki/*.md /tmp/1on1-wiki/ && cd /tmp/1on1-wiki && git add -A && git commit -m "Sync wiki from main repo" && git push && rm -rf /tmp/1on1-wiki
```

## When to sync

- After any changes to `docs/wiki/*.md` files
- After creating new wiki pages
- After updating sprint status or content

## Notes

- The `_Sidebar.md` file controls GitHub Wiki sidebar navigation
- GitHub Wiki treats `Home.md` as the landing page
- Wiki page links use `[[Page-Name]]` syntax
- File names with hyphens display as spaces in GitHub Wiki titles
