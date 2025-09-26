export const formatDateTag = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const month = date
    .toLocaleString("en-US", {
      month: "short",
    })
    .toUpperCase();
  const year = date.getFullYear().toString().slice(-2);

  return `${month}${year}`;
};

export const getDateTagSortValue = (value: string) => {
  if (!value || value.length < 5) {
    return Number.NEGATIVE_INFINITY;
  }

  const monthSegment = value.slice(0, 3);
  const yearSegment = value.slice(3);

  const monthIndex =
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(
      monthSegment.toUpperCase()
    );

  const fullYear = Number.parseInt(`20${yearSegment}`, 10);

  if (Number.isNaN(fullYear) || monthIndex < 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return fullYear * 100 + monthIndex;
};
