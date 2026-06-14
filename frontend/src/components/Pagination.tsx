import { Button } from "./ui";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function Pagination({ page, pageCount, onPrevious, onNext }: PaginationProps) {
  return (
    <div className="pagination">
      <Button variant="secondary" size="sm" type="button" onClick={onPrevious} disabled={page <= 1}>
        Previous
      </Button>
      <span className="muted strong small">
        Page {page} of {pageCount}
      </span>
      <Button variant="secondary" size="sm" type="button" onClick={onNext} disabled={page >= pageCount}>
        Next
      </Button>
    </div>
  );
}
