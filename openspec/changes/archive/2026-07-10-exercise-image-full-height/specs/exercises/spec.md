# Delta: exercises

**Change ID:** `exercise-image-full-height`
**Affects:** exercise media rendering on detail views
**Implements:** issue #2

---

## ADDED Requirements

### Requirement: Exercise Media Display on Detail Views

On every **exercise detail view** (the exercise detail page, the in-session
exercise detail, and the day-form exercise preview), the exercise's media
(static image or animated GIF) MUST be shown **whole and at its natural
proportions** — the full image at at least its proportional height, never
cropped by a fixed-height container. Very tall media MUST be capped to a
screen-friendly height while remaining fully visible (contained, not cropped).
When the media is missing or fails to load, a placeholder MUST render as a tidy
box. This applies uniformly across all detail views (they share one media
presentation).

#### Scenario: Portrait image shows at full height
- GIVEN an exercise whose image is taller than it is wide
- WHEN the user opens the exercise detail
- THEN the whole image is shown at its natural proportion (no crop, not forced into a short landscape box)

#### Scenario: Landscape/square image shows fully
- GIVEN an exercise whose image is landscape or square
- WHEN the user opens the exercise detail
- THEN the whole image is shown proportionally, filling the available width

#### Scenario: Very tall media is capped, not cropped
- GIVEN an exercise whose media is extremely tall
- WHEN the user opens the exercise detail
- THEN the media is capped to a screen-friendly height
- AND the entire media is still visible (contained), not cropped

#### Scenario: Missing or broken media
- GIVEN an exercise with no media URL, or one that fails to load
- WHEN the user opens the exercise detail
- THEN a placeholder is shown as a tidy box (not a collapsed or distorted area)

#### Scenario: Consistent across detail views
- GIVEN the same exercise
- WHEN it is viewed on the exercise detail page, the in-session detail, and the day-form preview
- THEN its media is presented the same way (full, proportional) in all three

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
