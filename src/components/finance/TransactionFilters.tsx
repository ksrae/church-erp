interface TransactionFiltersProps {
  startDate: string;
  endDate: string;
  searchTerm: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSearchChange: (term: string) => void;
}

function TransactionFilters({
  startDate,
  endDate,
  searchTerm,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
}: TransactionFiltersProps) {
  return (
    <div className="transaction-filters">
      <div className="filter-group">
        <label>시작일</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>
      <div className="filter-group">
        <label>종료일</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
      <div className="filter-group search">
        <label>검색</label>
        <input
          type="text"
          placeholder="설명 또는 계정명 검색..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default TransactionFilters;
