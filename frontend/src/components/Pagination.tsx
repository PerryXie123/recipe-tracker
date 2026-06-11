import { Button, Group, Text } from "@mantine/core";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function Pagination({ page, pageCount, onPrevious, onNext }: PaginationProps) {
  return (
    <Group className="pagination" justify="flex-end" gap="sm" mt="md">
      <Button variant="default" size="xs" type="button" onClick={onPrevious} disabled={page <= 1}>
        Previous
      </Button>
      <Text c="dimmed" size="sm" fw={700}>
        Page {page} of {pageCount}
      </Text>
      <Button variant="default" size="xs" type="button" onClick={onNext} disabled={page >= pageCount}>
        Next
      </Button>
    </Group>
  );
}
