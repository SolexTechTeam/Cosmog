"use client";

import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";

interface PaginatedTableProps {
  children: ReactElement<{ children?: ReactNode }>;
  pageSize?: number;
  className?: string;
}

const tableBody = (children: ReactNode) =>
  Children.toArray(children).find(
    (child) => isValidElement(child) && child.type === "tbody",
  ) as ReactElement<{ children?: ReactNode }> | undefined;

export default function PaginatedTable({ children, pageSize = 10, className = "" }: PaginatedTableProps) {
  const body = tableBody(children.props.children);
  const rows = body ? Children.toArray(body.props.children) : [];
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const tableChildren = Children.map(children.props.children, (child) => {
    if (!isValidElement(child) || child.type !== "tbody") return child;
    return cloneElement(child as ReactElement<{ children?: ReactNode }>, undefined, visibleRows);
  });

  return (
    <div className={`min-w-0 overflow-hidden rounded-md border border-border ${className}`}>
      <div className="max-h-[min(60vh,26rem)] overflow-auto">
        {cloneElement(children, undefined, tableChildren)}
      </div>
      {rows.length > pageSize && (
        <nav aria-label="Table pagination" className="flex items-center justify-between border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <span>
            Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="rounded px-2 py-1 font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-1 tabular-nums">{currentPage + 1} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
              disabled={currentPage >= pageCount - 1}
              className="rounded px-2 py-1 font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
