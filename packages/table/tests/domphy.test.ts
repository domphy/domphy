import { describe, expect, it } from "vitest"
import { createDomphyTable } from "../src/domphy/index"
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "../src/index"

// State notifications are microtask-batched; flush before asserting on listeners.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

type Person = { id: number; name: string; age: number }

const people: Person[] = [
  { id: 1, name: "Carol", age: 28 },
  { id: 2, name: "Alice", age: 45 },
  { id: 3, name: "Bob", age: 32 },
]

const helper = createColumnHelper<Person>()
const columns = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
]

function setup() {
  return createDomphyTable<Person>({
    data: people,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
  })
}

describe("createDomphyTable", () => {
  it("exposes the table-core API and initial state", () => {
    const { table } = setup()
    expect(table.getRowModel().rows.length).toBe(2) // pageSize 2
    expect(table.getState().pagination.pageSize).toBe(2)
  })

  it("bumps version and re-derives rows on sort change", async () => {
    const { table, version } = setup()
    const before = version()
    let bumps = 0
    version(() => bumps++)

    table.getColumn("name")?.toggleSorting(false) // sort ascending

    expect(version()).toBe(before + 1) // value updates synchronously
    const names = table.getRowModel().rows.map((r) => r.getValue("name"))
    expect(names).toEqual(["Alice", "Bob"]) // first page, sorted asc

    await flush()
    expect(bumps).toBe(1) // listener fires after microtask flush
  })

  it("bumps version on pagination change", () => {
    const { table, version } = setup()
    const before = version()

    table.nextPage()

    expect(version()).toBe(before + 1)
    expect(table.getState().pagination.pageIndex).toBe(1)
    expect(table.getRowModel().rows.length).toBe(1) // last page has 1 row
  })

  it("destroy stops version notifications", async () => {
    const { table, version, destroy } = setup()
    let bumps = 0
    version(() => bumps++)
    destroy()

    table.getColumn("age")?.toggleSorting(false)
    await flush()
    expect(bumps).toBe(0)
  })
})
