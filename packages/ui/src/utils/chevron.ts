/**
 * Inline chevron icon sized to the surrounding font (1em) and painted with
 * `currentColor`. The "‹ › « »" glyphs it replaces render at about a third of
 * the em box in most fonts, so a prev/next button read as a speck.
 */
function chevron(direction: "left" | "right", double = false): string {
  const points = direction === "left" ? "15 6 9 12 15 18" : "9 6 15 12 9 18";
  const shift = direction === "left" ? 3 : -3;
  const second = double
    ? `<polyline points="${points}" transform="translate(${shift} 0)"/>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:auto">` +
    `<polyline points="${points}"${double ? ` transform="translate(${-shift} 0)"` : ""}/>${second}</svg>`
  );
}

export { chevron };
