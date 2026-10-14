"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqSection {
  title: string;
  content: React.ReactNode;
}

const metricListClass = "list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground";
const termClass = "font-medium text-foreground";

const sections: FaqSection[] = [
  {
    title: "Home dashboard",
    content: (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Warehouse Inventory Overview</h3>
          <ul className={`${metricListClass} mt-1`}>
            <li><span className={termClass}>On-Hand</span> is physical stock currently in the warehouse. <span className={termClass}>OH Value</span> is the on-hand quantity multiplied by its average cost.</li>
            <li><span className={termClass}>Incoming — Units</span> is incoming quantity. <span className={termClass}>PO&apos;s</span> counts warehouse purchase orders currently In Transit, and <span className={termClass}>Value</span> sums those POs&apos; order totals. Direct-delivery POs are excluded from these warehouse PO figures.</li>
            <li><span className={termClass}>Allocated</span> is stock reserved for active sale orders. <span className={termClass}>Available (incl. incoming)</span> is On-Hand + Incoming − Allocated.</li>
            <li>The product selector scopes On-Hand, OH Value, Incoming Units, Allocated, and Available to one product or all products. Incoming PO count and value remain totals for all in-transit warehouse POs.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Order Metrics</h3>
          <ul className={`${metricListClass} mt-1`}>
            <li><span className={termClass}>Open Orders</span> counts orders with status Open. <span className={termClass}>Open Value</span> sums their order totals. <span className={termClass}>Outstanding</span> sums each open order&apos;s total minus payments received.</li>
            <li><span className={termClass}>Procurement — Need, Awaiting, Ready, Done</span> count active sale orders by allocation status: supply is short, linked PO supply is not received, enough stock is available to ship, or fulfillment is done. Active means Open or Shipped.</li>
            <li><span className={termClass}>Sales Demand</span> is the recorded demand quantity across all products or for the selected product.</li>
            <li>The owner selector scopes Open Orders, Open Value, Outstanding, and Procurement counts. It does not change Sales Demand. The product selector changes inventory quantities and Sales Demand, but not Incoming PO count or value.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "Sales orders: create, filter, and fulfill",
    content: (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Create a sale order by selecting a customer, adding products and quantities, checking unit prices and the payable summary, then completing the order details. The order appears as Open and its lines can be allocated from the order detail page.
        </p>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sales page metrics</h3>
          <ul className={`${metricListClass} mt-1`}>
            <li><span className={termClass}>Open Orders</span> and <span className={termClass}>Open Value</span> include orders whose status is Open.</li>
            <li><span className={termClass}>Total Orders</span> and <span className={termClass}>Total Value</span> include all orders in the selected month, including closed and cancelled orders.</li>
            <li>The month selector defaults to All months and scopes all four cards. The Total/Open toggle and other table filters change the rows, not these cards.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sale order lifecycle</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Open orders can be shipped, then marked Completed after delivery is confirmed. Cancelling an order releases its reservations. Returning a shipped order reverses its fulfillment and returns stock to inventory. Payment status is tracked separately from fulfillment status.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Allocation: what it means and how to use it",
    content: (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Allocation reserves specific product quantities for a sale order so the same stock is not promised to multiple orders. It is a reservation, not a shipment: on-hand stock changes when the order is fulfilled. Incoming PO quantities can be linked to demand while they are on the way.
        </p>
        <ul className={metricListClass}>
          <li><span className={termClass}>Need</span> — available on-hand and incoming supply does not cover the order line; procurement may be needed.</li>
          <li><span className={termClass}>Awaiting</span> — a linked PO is expected to cover some or all of the line, but the goods have not been received.</li>
          <li><span className={termClass}>Ready to Ship</span> — enough stock is available for fulfillment.</li>
          <li><span className={termClass}>Done</span> — the line is fulfilled.</li>
        </ul>
        <p className="text-sm leading-6 text-muted-foreground">
          On a sale order, use automatic allocation to reserve available stock, or manual allocation to choose quantities by lot. The pool reallocation action redistributes only unassigned warehouse stock across open orders by priority; existing allocations stay in place. Shortfall allocation can move a reservation from another open order, reducing that order&apos;s allocation by the same quantity.
        </p>
      </div>
    ),
  },
  {
    title: "Purchase orders: create, receive, and cancel",
    content: (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Create a PO by choosing a supplier and fulfillment type, adding products, quantities, and unit costs, then reviewing the cost summary. Use Warehouse when goods are coming into stock; use Direct Delivery when the supplier ships directly to the customer.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
          <li><span className={termClass}>Draft</span> — review and edit the PO before confirmation.</li>
          <li><span className={termClass}>Confirmed</span> — confirm the order with the supplier. For warehouse POs, review the allocation preview to link incoming quantities to sale-order shortfalls.</li>
          <li><span className={termClass}>In Transit</span> — record that the supplier has shipped the goods. Warehouse quantities count as incoming, not on-hand.</li>
          <li><span className={termClass}>Received</span> — check in the shipment. Received quantities become inventory lots with PO and cost traceability; linked sale orders can then be allocated from those lots.</li>
        </ol>
        <p className="text-sm leading-6 text-muted-foreground">
          Cancelling a PO reverses its outstanding, unreceived incoming quantity and releases its active reservations. Already received inventory stays in stock. The reversal is recorded in Inventory History; cancelling an already-cancelled PO does not add a second reversal.
        </p>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Purchase Orders page metrics</h3>
          <ul className={`${metricListClass} mt-1`}>
            <li><span className={termClass}>Draft, Confirmed, In-Transit, Received, and Cancelled</span> count matching POs in the current filtered list.</li>
            <li><span className={termClass}>Direct Delivery POs</span> counts non-cancelled POs set to direct delivery.</li>
            <li><span className={termClass}>Non-cancelled PO Value</span> sums the order totals of filtered POs, excluding cancelled orders. Search, status, and fulfillment filters also scope these cards.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "Inventory and Inventory History",
    content: (
      <div className="space-y-3">
        <ul className={metricListClass}>
          <li><span className={termClass}>On-Hand</span> is physical warehouse stock.</li>
          <li><span className={termClass}>Incoming</span> is supply on active warehouse POs that has not been received.</li>
          <li><span className={termClass}>Allocated</span> is reserved for sale orders.</li>
          <li><span className={termClass}>Unallocated (incl. incoming)</span> is On-Hand + Incoming − Allocated. It can include stock that has not arrived yet, so check Incoming before promising immediate shipment.</li>
          <li><span className={termClass}>Demand</span> is the quantity requested by active sale orders. Product detail also shows average cost, stock thresholds, lots, and linked orders.</li>
        </ul>
        <p className="text-sm leading-6 text-muted-foreground">
          Inventory is held in lots so receipt cost and purchase-order origin remain traceable. Inventory History is the movement ledger: use it to review receipts, sales fulfillment, returns, adjustments, reservations, and PO incoming reversals. A negative incoming entry marked as a PO cancellation is the audit record of reversed supply, not a physical stock removal.
        </p>
      </div>
    ),
  },
  {
    title: "Demand Priority and its metrics",
    content: (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Demand Priority ranks active sale orders (Open or Shipped) to help staff decide which shortfalls need attention first. The table shows an order&apos;s combined points, attention band, age, payment, procurement status, and item quantities.
        </p>
        <ul className={metricListClass}>
          <li><span className={termClass}>High / Med / Low Attention</span> count active order rows with 4+ points, 3–3.9 points, or below 3 points.</li>
          <li><span className={termClass}>Total Demand Value</span> sums quantity × unit price for items on all active orders. Search and table filters do not change these cards.</li>
          <li>Paid or Part Paid adds 3 base points; Awaiting Payment adds 2. EOI orders use quantity × 0.5 instead of payment points. Other orders receive 0 base points.</li>
          <li>Age adds 3 points at 14+ days, 2 at 7–13 days, 1 at 4–6 days, and 0 below 4 days. The attention band is based on base points plus age points.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Customer, supplier, and payment metrics",
    content: (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Customer detail</h3>
          <ul className={`${metricListClass} mt-1`}>
            <li><span className={termClass}>Total Orders</span> counts all of the customer&apos;s orders. <span className={termClass}>Open Orders</span> counts Open and Shipped orders.</li>
            <li><span className={termClass}>Revenue</span> sums order totals. <span className={termClass}>Outstanding</span> is total order value minus payments recorded across those orders.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Supplier detail</h3>
          <ul className={`${metricListClass} mt-1`}>
            <li><span className={termClass}>Total POs</span> counts all supplier POs. <span className={termClass}>Active POs</span> excludes Received and Cancelled POs. <span className={termClass}>Received</span> counts received POs.</li>
            <li><span className={termClass}>Total Spend</span> sums the recorded PO totals for the supplier, including cancelled POs.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Payment statuses</h3>
          <ul className={metricListClass}>
            <li><span className={termClass}>Not Requested</span> — no payment request has been sent. <span className={termClass}>Awaiting Payment</span> — a request was sent and payment is pending.</li>
            <li><span className={termClass}>Part Paid</span> — some payment has been recorded. <span className={termClass}>Paid</span> — the full amount is recorded.</li>
            <li><span className={termClass}>Refunded</span> — payment was returned to the customer. <span className={termClass}>Cancelled</span> — the payment request was voided.</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function HelpScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex((current) => current === index ? null : index);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Help &amp; FAQ</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          A guide to sales, allocation, procurement, inventory, and the metrics used across Solext.
        </p>
      </header>

      <div className="space-y-2" aria-label="Help topics">
        {sections.map((section, index) => {
          const isOpen = openIndex === index;
          const panelId = `help-topic-${index}`;
          return (
            <section key={section.title} className={`overflow-hidden rounded-lg border bg-card transition-colors ${isOpen ? "border-primary/40" : "border-border"}`}>
              <h2>
                <button
                  type="button"
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  onClick={() => toggle(index)}
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <span className="text-sm font-semibold text-foreground">{section.title}</span>
                  <ChevronDown aria-hidden="true" size={16} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                </button>
              </h2>
              {isOpen && (
                <div id={panelId} className="border-t border-border px-4 py-4 sm:px-5">
                  <div className="max-w-4xl space-y-3">{section.content}</div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
