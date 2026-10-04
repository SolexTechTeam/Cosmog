const colorMap: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  shipped: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-orange-100 text-orange-700",
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  "in transit": "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  awaiting_payment: "bg-yellow-100 text-yellow-700",
  part_paid: "bg-orange-100 text-orange-700",
  not_requested: "bg-gray-100 text-gray-600",
  refunded: "bg-red-100 text-red-700",
  "In Stock": "bg-green-100 text-green-700",
  "Low Stock": "bg-yellow-100 text-yellow-700",
  "Out of Stock": "bg-red-100 text-red-700",
  Incoming: "bg-blue-100 text-blue-700",
  in_transit: "bg-blue-100 text-blue-700",
  on_hand: "bg-green-100 text-green-700",
  depleted: "bg-gray-100 text-gray-600",
  active: "bg-blue-100 text-blue-700",
  fulfilled: "bg-green-100 text-green-700",
  released: "bg-gray-100 text-gray-600",
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = colorMap[status] || "bg-gray-100 text-gray-600";
  const display = status.replace(/_/g, " ");

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors}`}>
      {display}
    </span>
  );
}
