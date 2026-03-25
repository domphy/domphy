import { DomphyElement } from '@domphy/core'
import { table } from "@domphy/ui"

const tableData = [
    {
        invoice: "INV001",
        status: "Paid",
        totalAmount: "$250.00",
        payment: "Credit Card",
    },
    {
        invoice: "INV002",
        status: "Pending",
        totalAmount: "$150.00",
        payment: "PayPal",
    },
    {
        invoice: "INV003",
        status: "Unpaid",
        totalAmount: "$350.00",
        payment: "Bank Transfer",
    },
    {
        invoice: "INV004",
        status: "Paid",
        totalAmount: "$450.00",
        payment: "Credit Card",
    },
    {
        invoice: "INV005",
        status: "Paid",
        totalAmount: "$550.00",
        payment: "PayPal",
    },
    {
        invoice: "INV006",
        status: "Pending",
        totalAmount: "$200.00",
        payment: "Bank Transfer",
    },
    {
        invoice: "INV007",
        status: "Unpaid",
        totalAmount: "$300.00",
        payment: "Credit Card",
    },
]

const App: DomphyElement<"table"> = {
    table: [
        {
            caption: "A list of your recent invoices."
        },
        {
            thead: [{
                tr: Object.keys(tableData[0]).map((key) => (
                  {
                    th: key
                  }
                ))
            }]
        },
        {
            tbody: tableData.map(row => {
                return {
                    tr: Object.values(row).map(val => ({
                        td: val
                    }))
                }
            })
        }
    ],
    $: [table()],
}

export default App
