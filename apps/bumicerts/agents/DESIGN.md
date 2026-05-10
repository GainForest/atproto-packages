# Design Rules

Use this doc for UI quality, consistency, accessibility, icons, motion, and visual decisions.

## Design Goals

The UI should communicate:

- trust
- clarity
- care
- restraint
- craft

Prefer quiet confidence over noisy decoration.

## Core Visual Principles

- Plain backgrounds, rich details.
- Editorial minimalism over generic dashboard aesthetics.
- Character should come from typography, spacing, motion, imagery, and surface treatment.
- Use restraint. Avoid visual clutter.
- Reuse shared primitives and visual patterns before inventing new ones.

## Consistency Rules

- Use the existing design tokens, primitives, and shared component APIs.
- Keep spacing, radius, borders, and typography consistent across similar UI.
- Standardize loading, empty, and error states.
- Do not implement the same UI pattern multiple different ways without a strong reason.

## Accessibility

- Use semantic HTML first.
- Every interactive control must be keyboard-usable.
- Every form field needs an accessible label.
- Respect contrast and reduced-motion needs.
- Accessibility is part of production quality, not a later enhancement.

## Icons

- For Bumicert-specific concepts, use `BumicertIcon`.
- For all other icons, use Lucide.
- Choose icons by meaning, not vague resemblance.

## Buttons and Icons

- Do not force icon sizing inside shared `Button` components when the button already owns icon sizing through its API.

## Motion

- Motion should communicate meaning, not decorate emptiness.
- Keep transitions deliberate and restrained.
- Prefer a few coherent interaction patterns over scattered animation experiments.
- Do not re-animate stable chrome unnecessarily.

## Avoid These UI Smells

Do not introduce:

- random gradient blobs
- generic “AI UI” gimmicks
- decorative motion without purpose
- inconsistent card treatments
- inconsistent spacing systems
- inconsistent typography hierarchy
- inaccessible custom controls
- one-off components that bypass shared primitives without reason

## Design References

- Use existing shared primitives, nearby approved route UI, and matching files in `../docs/examples/` as the current source of visual direction.
- If a relevant root skill exists for frontend quality, use it after local docs.
- Local Bumicerts design rules always win over generic design skills.

## Review Checklist

Before finishing, check:

- Does this look like it belongs in the same app?
- Did I reuse existing primitives and patterns?
- Is the UI accessible?
- Is the motion restrained and meaningful?
- Did I avoid generic AI-looking decoration?
