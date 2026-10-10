const colorMap: Record<string, string> = {
  // Order status
  open: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  returned: "bg-orange-50 text-orange-700 border-orange-200",

  // PO status
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  "in transit": "bg-indigo-50 text-indigo-700 border-indigo-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",

  // Payment status
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  awaiting_payment: "bg-amber-50 text-amber-700 border-amber-200",
  part_paid: "bg-orange-50 text-orange-700 border-orange-200",
  not_requested: "bg-gray-50 text-gray-500 border-gray-200",
  refunded: "bg-red-50 text-red-700 border-red-200",

  // Stock status
  "In Stock": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Low Stock": "bg-amber-50 text-amber-700 border-amber-200",
  "Out of Stock": "bg-red-50 text-red-600 border-red-200",
  Incoming: "bg-indigo-50 text-indigo-700 border-indigo-200",

  // Lot status
  in_transit: "bg-indigo-50 text-indigo-700 border-indigo-200",
  on_hand: "bg-emerald-50 text-emerald-700 border-emerald-200",
  depleted: "bg-gray-50 text-gray-500 border-gray-200",

  // Procurement / allocation status
  awaiting: "bg-orange-50 text-orange-700 border-orange-200",
  need: "bg-red-50 text-red-700 border-red-200",
  ready_to_ship: "bg-emerald-50 text-emerald-700 border-emerald-200",

  // Reservation / general
  active: "bg-blue-50 text-blue-700 border-blue-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
  fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  released: "bg-gray-50 text-gray-500 border-gray-200",

  // Priority
  low: "bg-gray-50 text-gray-600 border-gray-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
  "High Attention": "bg-red-50 text-red-700 border-red-200",
  "Med Attention": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Low Attention": "bg-blue-50 text-blue-700 border-blue-200",

  // Ledger movement types
  lot_created: "bg-indigo-50 text-indigo-700 border-indigo-200",
  po_in_transit: "bg-indigo-50 text-indigo-700 border-indigo-200",
  reserved: "bg-amber-50 text-amber-700 border-amber-200",
  adjustment: "bg-gray-50 text-gray-600 border-gray-200",
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = colorMap[status] || "bg-gray-50 text-gray-500 border-gray-200";
  const display = status.replace(/_/g, " ");

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${colors}`}>
      {display}
    </span>
  );
}
