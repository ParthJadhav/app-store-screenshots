# Contributing

Thanks for contributing to `app-store-screenshots`.

This repository is intentionally small, but changes still affect real agent behavior. Most contributions here change either:

- `README.md`: how humans discover and install the skill
- `skills/app-store-screenshots/SKILL.md`: how coding agents actually behave

## What Makes a Good Contribution

- Fixes a real workflow problem for people generating App Store screenshots
- Improves the quality or reliability of the generated output
- Makes the skill easier to use across agents and environments
- Keeps the skill opinionated, but still user-driven

## Scope Guidelines

Good fit:

- Better export reliability
- Better prompt flow and requirements gathering
- Stronger copy/design guidance
- Better contributor ergonomics
- Clearer installation or usage docs

Usually not a fit:

- Hardcoded brand styles
- Repo-specific assumptions that do not generalize
- Large framework additions outside the skill's purpose
- Changes that make the skill significantly more verbose without improving outcomes

## Before Opening a PR

1. Check open PRs to avoid overlapping work.
2. Read both `README.md` and `skills/app-store-screenshots/SKILL.md`.
3. Keep user-facing docs and skill behavior aligned when applicable.

## Testing Changes

There is no traditional automated test suite in this repository, so use a manual smoke-test checklist.

### For README-only changes

- Confirm installation instructions still make sense
- Confirm example paths and commands are copy-pasteable

### For `SKILL.md` changes

Validate the skill against at least one realistic scenario:

1. Start from an empty folder
2. Ask an agent to generate App Store screenshots for a sample app
3. Confirm the skill:
   - asks the required discovery questions first
   - preserves the "screenshots are ads, not docs" principle
   - keeps the generator architecture coherent
   - produces export instructions that are internally consistent

### Strongly Recommended

Include in your PR description:

- the prompt you used to test the skill
- what behavior changed
- what stayed intentionally unchanged

## Authoring Guidelines

- Prefer compact, high-signal instructions over long prose
- Keep examples realistic and production-oriented
- Avoid duplicating large blocks between `README.md` and `SKILL.md` unless the duplication helps different audiences
- If a change modifies workflow expectations, document it in both files when relevant

## Pull Request Checklist

Before submitting, verify:

- the change solves a concrete problem
- the wording is clear for both humans and agents
- README and SKILL instructions do not contradict each other
- the PR description explains why the change is useful
