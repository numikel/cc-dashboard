# 0003. Claude-inspired theme system

## Status

Accepted.

## Context

The dashboard should feel visually close to Claude Code documentation while still being an independent local tool. It must support `light`, `dark` and `system` modes.

## Decision

Use CSS variables for color tokens and apply the active theme through root `data-theme` attributes. Persist the selected mode in `localStorage`; resolve `system` through `prefers-color-scheme`.

The starting palette uses warm clay accents, slate text and ivory/beige neutrals inspired by `https://code.claude.com/docs/en/overview`.

## Consequences

- Components avoid hardcoded colors and inherit the current theme.
- Recharts components use theme-compatible color tokens.
- The layout needs an inline theme initialization script to reduce flash of the wrong theme.
