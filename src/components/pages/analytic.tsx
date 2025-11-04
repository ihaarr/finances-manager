import { FunctionalComponent } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { useData } from '../../context/DataContext';

interface Operation {
  id: number;
  subcategory_id: number;
  date: string;
  value: number;
}
interface Category {
  id: number;
  name: string;
}
interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

type DateFilter = 'day' | 'week' | 'month' | 'year' | 'custom';

const Analytic: FunctionalComponent = () => {
  const { categories, subcategories, operations, loading } = useData();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  // Helper function to format date as YYYY-MM-DD in local time
  function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Filter operations based on date and category/subcategory
  const filteredOperations = useMemo(() => {
    let filtered = [...operations];

    // Filter by date
    if (dateFilter === 'custom') {
      if (customFrom) {
        filtered = filtered.filter(op => op.date >= customFrom);
      }
      if (customTo) {
        filtered = filtered.filter(op => op.date <= customTo);
      }
    } else {
      const now = new Date();
      let fromStr: string | null = null;
      let toStr: string | null = null;

      if (dateFilter === 'day') {
        // Current day: today in local timezone
        fromStr = formatDateLocal(now);
        toStr = formatDateLocal(now);
      } else if (dateFilter === 'week') {
        // Current week: from Sunday to Saturday of current week
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const fromDate = new Date(now);
        fromDate.setDate(now.getDate() - dayOfWeek); // Go back to Sunday
        fromDate.setHours(0, 0, 0, 0);
        
        const toDate = new Date(fromDate);
        toDate.setDate(fromDate.getDate() + 6); // Saturday of the same week
        
        fromStr = formatDateLocal(fromDate);
        toStr = formatDateLocal(toDate);
      } else if (dateFilter === 'month') {
        // Current month: from first day to last day of current month
        const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
        
        fromStr = formatDateLocal(fromDate);
        toStr = formatDateLocal(toDate);
      } else if (dateFilter === 'year') {
        // Current year: from January 1st to December 31st of current year
        const fromDate = new Date(now.getFullYear(), 0, 1); // January 1st
        const toDate = new Date(now.getFullYear(), 11, 31); // December 31st
        
        fromStr = formatDateLocal(fromDate);
        toStr = formatDateLocal(toDate);
      }

      if (fromStr && toStr) {
        filtered = filtered.filter(op => op.date >= fromStr! && op.date <= toStr!);
      }
    }

    // Filter by category
    if (selectedCategory) {
      const categorySubcategoryIds = subcategories
        .filter(sub => sub.category_id === selectedCategory)
        .map(sub => sub.id);
      filtered = filtered.filter(op => categorySubcategoryIds.includes(op.subcategory_id));
    }

    return filtered;
  }, [operations, dateFilter, customFrom, customTo, selectedCategory]);

  // Calculate analytics for filtered operations
  const totalOperations = filteredOperations.length;
  const totalCategories = categories.length;
  const totalSubcategories = subcategories.length;
  const totalAmount = filteredOperations.reduce((sum, op) => sum + op.value, 0);

  // Calculate amounts by category
  const amountsByCategory = useMemo(() => {
    const amounts: { [key: number]: number } = {};
    filteredOperations.forEach(op => {
      const subcategory = subcategories.find(s => s.id === op.subcategory_id);
      if (subcategory) {
        if (amounts[subcategory.category_id]) {
          amounts[subcategory.category_id] += op.value;
        } else {
          amounts[subcategory.category_id] = op.value;
        }
      }
    });
    return amounts;
  }, [filteredOperations, subcategories]);

  // Calculate amounts by subcategory
  const amountsBySubcategory = useMemo(() => {
    const amounts: { [key: number]: number } = {};
    filteredOperations.forEach(op => {
      if (amounts[op.subcategory_id]) {
        amounts[op.subcategory_id] += op.value;
      } else {
        amounts[op.subcategory_id] = op.value;
      }
    });
    return amounts;
  }, [filteredOperations]);

  if (loading) {
    return (
      <div class="container py-5 text-center">
        <h1 class="display-4">Аналитика</h1>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div class="container py-4" style={{color: '#e6e8eb'}}>
      <h1 class="display-4 mb-4">Аналитика</h1>
      
      {/* Filters */}
      <div class="mb-4" style={{background: '#23242c', borderRadius: '8px', padding: '16px'}}>
        <div class="row g-3">
          {/* Date Filter */}
          <div class="col-12 col-md-6">
            <label class="form-label" style={{color: '#e6e8eb', marginBottom: '8px'}}>Период</label>
            <div class="btn-group d-flex" role="group">
              <button
                type="button"
                class={`btn ${dateFilter === 'day' ? 'btn-primary' : 'btn-secondary'}`}
                style={dateFilter === 'day' ? {background: '#3e62ad'} : {background: '#373a42', color: '#e6e8eb'}}
                onClick={() => setDateFilter('day')}
              >
                День
              </button>
              <button
                type="button"
                class={`btn ${dateFilter === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                style={dateFilter === 'week' ? {background: '#3e62ad'} : {background: '#373a42', color: '#e6e8eb'}}
                onClick={() => setDateFilter('week')}
              >
                Неделя
              </button>
              <button
                type="button"
                class={`btn ${dateFilter === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                style={dateFilter === 'month' ? {background: '#3e62ad'} : {background: '#373a42', color: '#e6e8eb'}}
                onClick={() => setDateFilter('month')}
              >
                Месяц
              </button>
              <button
                type="button"
                class={`btn ${dateFilter === 'year' ? 'btn-primary' : 'btn-secondary'}`}
                style={dateFilter === 'year' ? {background: '#3e62ad'} : {background: '#373a42', color: '#e6e8eb'}}
                onClick={() => setDateFilter('year')}
              >
                Год
              </button>
              <button
                type="button"
                class={`btn ${dateFilter === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                style={dateFilter === 'custom' ? {background: '#3e62ad'} : {background: '#373a42', color: '#e6e8eb'}}
                onClick={() => setDateFilter('custom')}
              >
                Период
              </button>
            </div>
            {dateFilter === 'custom' && (
              <div class="d-flex gap-2 mt-2">
                <input
                  type="date"
                  class="form-control"
                  style={{background: '#18191A', color: '#e6e8eb', border: '1px solid #444'}}
                  value={customFrom}
                  onInput={(e) => setCustomFrom((e.target as HTMLInputElement).value)}
                  placeholder="От"
                />
                <input
                  type="date"
                  class="form-control"
                  style={{background: '#18191A', color: '#e6e8eb', border: '1px solid #444'}}
                  value={customTo}
                  onInput={(e) => setCustomTo((e.target as HTMLInputElement).value)}
                  placeholder="До"
                />
              </div>
            )}
          </div>
{/* Category Filter Only */}
<div class="col-12 col-md-6">
  <div class="row g-2">
    <div class="col-12">
      <label class="form-label" style={{color: '#e6e8eb', marginBottom: '8px'}}>Категория</label>
      <select
        class="form-select"
        style={{background: '#18191A', color: '#e6e8eb', border: '1px solid #444'}}
        value={selectedCategory || ''}
        onChange={(e: Event) => {
          const value = (e.target as HTMLInputElement).value;
          setSelectedCategory(value ? Number(value) : null);
        }}
      >
        <option value="">Все</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>

        </div>
      </div>

      {/* Summary Cards */}
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card bg-dark text-white" style={{border: '1px solid #373a42'}}>
            <div class="card-body">
              <h5 class="card-title">Категории</h5>
              <p class="card-text display-4">{totalCategories}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-dark text-white" style={{border: '1px solid #373a42'}}>
            <div class="card-body">
              <h5 class="card-title">Подкатегории</h5>
              <p class="card-text display-4">{totalSubcategories}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-dark text-white" style={{border: '1px solid #373a42'}}>
            <div class="card-body">
              <h5 class="card-title">Операции</h5>
              <p class="card-text display-4">{totalOperations}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-dark text-white" style={{border: '1px solid #373a42'}}>
            <div class="card-body">
              <h5 class="card-title">Сумма</h5>
              <p class="card-text display-4">
                {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Visualization */}
      <div class="row mb-4">
        <div class="col-12">
          <div class="card bg-dark" style={{border: '1px solid #373a42', padding: '20px'}}>
            <h3 class="mb-3" style={{color: '#e6e8eb'}}>Распределение по категориям</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {Object.entries(amountsByCategory)
                .sort((a, b) => amountsByCategory[parseInt(b[0])] - amountsByCategory[parseInt(a[0])])
                .map(([categoryId, amount]) => {
                  const category = categories.find(c => c.id === parseInt(categoryId));
                  if (!category) return null;
                  const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
                  return (
                    <div
                      key={category.id}
                      style={{position: 'relative'}}
                      onMouseEnter={(e) => {
                        const tooltip = e.currentTarget.querySelector('.chart-tooltip') as HTMLElement;
                        if (tooltip) tooltip.style.visibility = 'visible';
                      }}
                      onMouseLeave={(e) => {
                        const tooltip = e.currentTarget.querySelector('.chart-tooltip') as HTMLElement;
                        if (tooltip) tooltip.style.visibility = 'hidden';
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                        <span style={{color: '#e6e8eb'}}>{category.name}</span>
                        <span style={{color: '#e6e8eb'}}>{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div style={{background: '#373a42', height: '20px', borderRadius: '4px', overflow: 'hidden'}}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: '#3e62ad',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <div
                        class="chart-tooltip"
                        style={{
                          visibility: 'hidden',
                          position: 'absolute',
                          top: '-40px',
                          left: '0',
                          background: '#000',
                          color: '#fff',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          zIndex: 1000,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {category.name}: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount)} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory Chart */}
      <div class="row">
        <div class="col-12">
          <div class="card bg-dark" style={{border: '1px solid #373a42', padding: '20px'}}>
            <h3 class="mb-3" style={{color: '#e6e8eb'}}>Распределение по подкатегориям</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {Object.entries(amountsBySubcategory)
                .sort((a, b) => amountsBySubcategory[parseInt(b[0])] - amountsBySubcategory[parseInt(a[0])])
                .map(([subcategoryId, amount]) => {
                  const subcategory = subcategories.find(s => s.id === parseInt(subcategoryId));
                  const category = subcategory ? categories.find(c => c.id === subcategory.category_id) : null;
                  if (!subcategory) return null;
                  const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
                  return (
                    <div
                      key={subcategory.id}
                      style={{position: 'relative'}}
                      onMouseEnter={(e) => {
                        const tooltip = e.currentTarget.querySelector('.chart-tooltip') as HTMLElement;
                        if (tooltip) tooltip.style.visibility = 'visible';
                      }}
                      onMouseLeave={(e) => {
                        const tooltip = e.currentTarget.querySelector('.chart-tooltip') as HTMLElement;
                        if (tooltip) tooltip.style.visibility = 'hidden';
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                        <span style={{color: '#e6e8eb'}}>{category?.name} / {subcategory.name}</span>
                        <span style={{color: '#e6e8eb'}}>{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div style={{background: '#373a42', height: '20px', borderRadius: '4px', overflow: 'hidden'}}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: '#5a7bd1',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <div
                        class="chart-tooltip"
                        style={{
                          visibility: 'hidden',
                          position: 'absolute',
                          top: '-40px',
                          left: '0',
                          background: '#000',
                          color: '#fff',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          zIndex: 1000,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {category?.name} / {subcategory.name}: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount)} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytic;
