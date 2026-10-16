---
title: "Challenge"
ogImage: true
isChallenge: true
---

# Challenge!

::challenge
Build an interactive color swatch picker
::

If you are following this book sequentially then you are perfectly prepared to complete this challenge with the ease of a knife going through cream cheese.

Sorry about that, I just watched an improv rap act.

## The starting point

- A `colors` array with five `{ name, hex }` objects.
- A `selected` ref that starts **empty** (no color chosen).
- A preview box that currently does nothing.
- Some starting CSS classes for the markup.

## The requirements

1. **Render a swatch per color.** From the `colors` array create a list of `button`s whose background uses each color's `hex` value.
2. **Select on click.** Clicking a swatch sets it as the `selected` color.
3. **Update the preview.** The preview box shows the selected color, using its `hex` value as the background.
4. **Mark the selection.** The selected swatch should be visually distinguishable from the others.
5. **Disable the selected swatch.** A swatch that is already selected can't be clicked again (disable it). All the other swatches stay enabled.
6. **Show the name.** Below the preview, display the selected color's `name` as text.
7. **Wire up the Reset button.** It clears the selection and is disabled while nothing is selected. After resetting, every swatch is selectable again.

::warn

The automatic checks need a few stable hooks so they don't depend on your exact markup. Please use these:

- Each swatch: `data-testid="swatch"` and an accessible `aria-label` equal to the color's `name`.
- The preview box: `data-testid="preview"`.
- The name output: `data-testid="selected-name"`.
- The reset button: `data-testid="reset"`.
- When a swatch is selected, also give it the class `selected`.

::

::tip
You don't need to hardcode five buttons (remember your training). The checks verify that the swatches come from the `colors` array.
::

When you are done, use the **Check my work** button below to verify your solution.
