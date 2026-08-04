// A container object that references itself — extraction's cycle guard must
// keep the walk from recursing forever.
const container = { el: { div: "hi" } };
container.self = container;
export default container;
