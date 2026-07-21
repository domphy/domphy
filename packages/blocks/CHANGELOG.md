# @domphy/blocks Changelog

## 0.1.2

- Device mock defaults: `android` / `iphone` / `safari` ship sample SVG screen content when called with no media props.
- `bentoGrid`: mosaic column/row spans only at `min-width: 64em`; avoid serializing CSS `undefined`.
- `scrollProgress`: resting fill only when the scroll target has no overflow; scrollable pages at top report `scaleX(0)`.
- `terminal`: full text at rest; retypes on start; honors `prefers-reduced-motion`.
- `smoothCursor`: in-flow resting glyph for catalog capture.
- `spinningText`: explicit ring box so absolute glyphs do not collapse layout.

## 0.1.0

- Initial public blocks surface (shadcn + Magic UI clean-room factories).
