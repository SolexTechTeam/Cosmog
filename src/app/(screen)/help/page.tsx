"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqSection {
  title: string;
  content: React.ReactNode;
}

const sections: FaqSection[] = [
  {
    title: "Order Lifecycle",
    content: (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Sale Orders (SO)</p>
          <p className="text-sm text-muted-foreground">
            Open &rarr; Shipped &rarr; Completed. Orders start as Open when created. Shipping allocates
            and fulfills inventory. Once delivered and confirmed, the order moves to Completed. Orders
            can also be Cancelled (releases reservations) or Returned (reverses fulfillment and returns stock).
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Purchase Orders (PO)</p>
          <p className="text-sm text-muted-foreground">
            Draft &rarr; Confirmed &rarr; In Transit &rarr; Received. Drafts are preliminary and can be
            edited freely. Confirming a PO locks it and sends it to the supplier. In Transit means goods
            are on their way. Received means inventory has been checked in and lots created.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Inventory & Stock",
    content: (
      <div className="space-y-2">
        <p className="text-sm text-foreground">
          Stock is tracked across several quantities:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li><span className="text-foreground font-medium">On-Hand</span> &mdash; total physical units in the warehouse.</li>
          <li><span className="text-foreground font-medium">Reserved</span> &mdash; units allocated to open sale orders but not yet shipped.</li>
          <li><span className="text-foreground font-medium">Available</span> &mdash; On-Hand minus Reserved. What you can sell or allocate right now.</li>
          <li><span className="text-foreground font-medium">In-Transit</span> &mdash; units on confirmed purchase orders that haven&apos;t arrived yet.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Inventory is organized into <span className="text-foreground font-medium">Lots</span>, each tied to a
          specific purchase order and unit cost. This enables FIFO costing and traceability.
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Sell Price</span> = Avg Cost &times; Margin &times; (1 + GST Rate). Margin and GST rate are configurable in pricing settings (defaults: 1.25 margin, 10% GST).
        </p>
      </div>
    ),
  },
  {
    title: "Demand Priority",
    content: (
      <div className="space-y-2">
        <p className="text-sm text-foreground">
          Demand Priority scores open sale orders to help you decide which to fulfill first.
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Base points</span> come from payment status and order type:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Paid or Part-Paid = 3 points</li>
          <li>Awaiting Payment = 2 points</li>
          <li>EOI (Expression of Interest) orders = quantity &times; 0.5 points</li>
          <li>Otherwise = 0 points</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Age points</span> increase the longer an order stays open:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>14+ days open = 3 points</li>
          <li>7&ndash;13 days = 2 points</li>
          <li>4&ndash;6 days = 1 point</li>
          <li>Less than 4 days = 0 points</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Thresholds:</span> High &ge; 4 points, Med &ge; 3, Low &lt; 3.
        </p>
      </div>
    ),
  },
  {
    title: "Payment Statuses",
    content: (
      <div className="space-y-1">
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li><span className="text-foreground font-medium">Not Requested</span> &mdash; no payment has been requested from the customer yet.</li>
          <li><span className="text-foreground font-medium">Awaiting Payment</span> &mdash; an invoice or payment request has been sent; waiting on the customer.</li>
          <li><span className="text-foreground font-medium">Part Paid</span> &mdash; a partial payment has been received; a balance remains.</li>
          <li><span className="text-foreground font-medium">Paid</span> &mdash; full payment received.</li>
          <li><span className="text-foreground font-medium">Refunded</span> &mdash; payment was returned to the customer (typically after a return or cancellation).</li>
          <li><span className="text-foreground font-medium">Cancelled</span> &mdash; the payment request was voided; no payment expected.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Allocation & Procurement",
    content: (
      <div className="space-y-2">
        <p className="text-sm text-foreground">
          Each sale order line tracks whether inventory is available to fulfill it:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li><span className="text-foreground font-medium">Need</span> &mdash; not enough stock on hand or on order. A purchase order should be created.</li>
          <li><span className="text-foreground font-medium">Awaiting</span> &mdash; a linked purchase order exists but hasn&apos;t been received yet. Stock is in transit.</li>
          <li><span className="text-foreground font-medium">Ready to Ship</span> &mdash; sufficient inventory is available. The order can be shipped immediately.</li>
        </ul>
      </div>
    ),
  },
];

export default function HelpScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Help &amp; FAQ</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Common questions about how Solext works</p>
      </div>

      <div className="flex flex-col gap-3">
        {sections.map((section, index) => (
          <div key={section.title} className="rounded-lg border border-border bg-muted px-4 py-3">
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-semibold text-foreground">{section.title}</span>
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform duration-200 ${
                  openIndex === index ? "rotate-180" : ""
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="mt-3 border-t border-border pt-3">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
