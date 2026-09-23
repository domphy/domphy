export const App = { div: "x" };
// Settles as an UNHANDLED rejection while the run is still importing files.
Promise.reject(new Error("floating-rejection"));
