// A zero-arg factory whose result is an ARRAY of elements — the array must
// feed the same one-unit path as a static array export (duplicate-key fires).
export const makeItems = () => [
  { div: "a", _key: 1 },
  { div: "b", _key: 1 },
];
