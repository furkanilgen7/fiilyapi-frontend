import { Button } from "@/components/ui";
import "./personnel-list.css";

export interface PersonnelPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * P 235-243 · sayfalama şeridi — spec K-E: tüm kadro tek istekte çekildiği
 * için sayfalama İSTEMCİDE yapılır (`paginateClientSide`).
 */
export function PersonnelPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: PersonnelPaginationProps) {
  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="personel-pagination">
      {/* 236 */}
      <span className="personel-pagination__summary">
        {totalCount} personelden {start}–{end} gösteriliyor
      </span>
      {/* 237-242 */}
      <div className="personel-pagination__pages">
        <Button
          variant="secondary"
          size="sm"
          aria-label="Önceki sayfa"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </Button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={pageNumber === page ? "primary" : "secondary"}
            size="sm"
            aria-label={`Sayfa ${pageNumber}`}
            aria-current={pageNumber === page ? "page" : undefined}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          aria-label="Sonraki sayfa"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </Button>
      </div>
    </div>
  );
}
