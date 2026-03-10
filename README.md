# 1on1

**Structured one-on-one meeting management platform for companies.**

A SaaS application that helps organizations run effective, data-driven 1:1 meetings between managers and their direct reports. Unlike general-purpose meeting tools, 1on1 focuses on structured questionnaire-based sessions with longitudinal analytics — enabling companies to track employee engagement, wellbeing, and performance over months and years.

## Core Value Proposition

- **Structured sessions**: Customizable questionnaire templates with multiple answer types (ratings, scales, text, mood) that produce quantifiable data
- **Historical context**: Every session surfaces past notes, action items, and score trends so managers walk in prepared
- **Long-term analytics**: Track engagement, wellbeing, and performance scores over time — ready for annual reviews and salary negotiations
- **Company-configurable**: Each organization defines its own teams, questionnaires, and evaluation criteria

## Documentation

Full project documentation is available on the [GitHub Wiki](https://github.com/aibaza/1on1/wiki).

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | Tech stack, project structure, deployment strategy |
| [Data Model](docs/data-model.md) | Complete database schema with entity relationships |
| [Features](docs/features.md) | Feature breakdown: MVP, v2, v3 roadmap |
| [UX Flows](docs/ux-flows.md) | User experience patterns, wireframes, screen flows |
| [Questionnaires](docs/questionnaires.md) | Question types, answer formats, template system design |
| [Analytics](docs/analytics.md) | Metrics, KPIs, charting strategy, data aggregation |
| [Security & Multi-tenancy](docs/security.md) | Authentication, authorization, data isolation, GDPR |

### Wiki Sync

The wiki source of truth lives in `docs/wiki/`. Changes are automatically synced to the GitHub Wiki via the `sync-wiki` GitHub Actions workflow on every push to `main` that modifies `docs/wiki/**`. You can also trigger it manually from the Actions tab.

For local sync (requires SSH key or PAT — the `gh` CLI OAuth token does not support wiki repos):

```bash
./scripts/sync-wiki.sh
```

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
