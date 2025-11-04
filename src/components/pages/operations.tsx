import { FunctionalComponent } from 'preact';
import { useEffect, useState, useMemo } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
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

const Operations: FunctionalComponent = () => {
  const { operations: allOperations, categories, subcategories, refreshOperations } = useData();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newOperationSubcategory, setNewOperationSubcategory] = useState<number | null>(null);
  const [newOperationDate, setNewOperationDate] = useState(new Date().toISOString().split('T')[0]);
  const [newOperationValue, setNewOperationValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<number>>(new Set());


  // Helper function to format date as YYYY-MM-DD in local time
  function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Filter operations on frontend
  const operations = useMemo(() => {
    let filtered = [...allOperations];

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

    // Filter by subcategory
    if (selectedSubcategory) {
      filtered = filtered.filter(op => op.subcategory_id === selectedSubcategory);
    }

    return filtered;
  }, [allOperations, dateFilter, customFrom, customTo, selectedSubcategory]);

  function formatValue(value: number): string {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value / 100);
  }

  function toggleCategory(categoryId: number) {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  }

  function toggleSubcategory(subcategoryId: number) {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(subcategoryId)) {
      newExpanded.delete(subcategoryId);
    } else {
      newExpanded.add(subcategoryId);
    }
    setExpandedSubcategories(newExpanded);
  }

  function groupOperationsByCategory(): Array<{category: Category, subcategories: Array<{subcategory: Subcategory, operations: Operation[]}>}> {
    const grouped: Map<number, {category: Category, subcategories: Map<number, {subcategory: Subcategory, operations: Operation[]}>}> = new Map();

    operations.forEach(op => {
      const sub = subcategories.find(s => s.id === op.subcategory_id);
      if (!sub) return;
      
      const cat = categories.find(c => c.id === sub.category_id);
      if (!cat) return;

      if (!grouped.has(cat.id)) {
        grouped.set(cat.id, { category: cat, subcategories: new Map() });
      }

      const catGroup = grouped.get(cat.id)!;
      if (!catGroup.subcategories.has(sub.id)) {
        catGroup.subcategories.set(sub.id, { subcategory: sub, operations: [] });
      }

      catGroup.subcategories.get(sub.id)!.operations.push(op);
    });

    // Convert to array and sort subcategories within each category
    return Array.from(grouped.values()).map(group => ({
      category: group.category,
      subcategories: Array.from(group.subcategories.values()).sort((a, b) => a.subcategory.name.localeCompare(b.subcategory.name))
    })).sort((a, b) => a.category.name.localeCompare(b.category.name));
  }

  function onAddOperation() {
    setNewOperationSubcategory(null);
    setNewOperationDate(new Date().toISOString().split('T')[0]);
    setNewOperationValue('');
    setError('');
    setShowModal(true);
  }

  async function saveOperation() {
    if (!newOperationSubcategory) return setError('Выберите подкатегорию');
    if (!newOperationDate) return setError('Укажите дату');
    if (!newOperationValue || Number(newOperationValue) <= 0) return setError('Укажите сумму');
    
    setSaving(true);
    setError('');
    try {
      // Convert value from rubles to kopecks (assuming input is in rubles)
      const valueInKopecks = Math.round(Number(newOperationValue) * 100);
      await invoke('create_operation', {
        subcategoryId: newOperationSubcategory,
        date: newOperationDate,
        value: valueInKopecks,
      });
      setShowModal(false);
      // Refresh operations instead of making a new request
      await refreshOperations();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="container py-4" style={{color: '#e6e8eb'}}>
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h2 class="fw-bold mb-0" style={{color: '#e6e8eb', fontSize: '2.3rem'}}>Операции</h2>
        <button class="btn btn-primary" style={{background: '#3e62ad', borderColor: '#345091'}} onClick={onAddOperation}>
          + Добавить операцию
        </button>
      </div>

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

          {/* Subcategory Filter */}
          <div class="col-12 col-md-6">
            <label class="form-label" style={{color: '#e6e8eb', marginBottom: '8px'}}>Подкатегория</label>
            <select
              class="form-select"
              style={{background: '#18191A', color: '#e6e8eb', border: '1px solid #444'}}
              value={selectedSubcategory || ''}
              onChange={(e: Event) => setSelectedSubcategory(e.target && (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null)}
            >
              <option value="">Все</option>
              {subcategories.map(sub => {
                const cat = categories.find(c => c.id === sub.category_id);
                return (
                  <option key={sub.id} value={sub.id}>
                    {cat ? `${cat.name} / ${sub.name}` : sub.name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Operations List */}
      <div>
        {operations.length === 0 ? (
          <div class="text-center py-5" style={{color: '#999'}}>
            Нет операций за выбранный период
          </div>
        ) : (
          groupOperationsByCategory().map(({ category, subcategories }) => {
            const isExpanded = expandedCategories.has(category.id);
            const folderIcon = <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{color: '#bfc4cd', marginRight: '8px'}}>
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
            </svg>;
            const expandIcon = isExpanded ? '▼' : '▶';
            
            return (
              <div key={category.id} style={{background: '#23242c', borderRadius: '8px', marginBottom: 12, overflow: 'hidden', boxShadow: '0 1px 4px #15151b80'}}>
                {/* Category Header */}
                <div
                  class="d-flex align-items-center px-3 py-2"
                  style={{color: '#e6e8eb', cursor: 'pointer', userSelect: 'none'}}
                  onClick={() => toggleCategory(category.id)}
                >
                  <span style={{marginRight: '8px', fontSize: '12px', color: '#999'}}>{expandIcon}</span>
                  {folderIcon}
                  <span class="fw-semibold">{category.name}</span>
                  <span class="ms-auto" style={{color: '#999', fontSize: '0.9em'}}>
                    {subcategories.reduce((sum, sub) => sum + sub.operations.length, 0)} операций
                  </span>
                </div>

                {/* Subcategories and Operations */}
                {isExpanded && (
                  <div style={{borderTop: '1px solid #333'}}>
                    {subcategories.map(({ subcategory, operations: subOps }, subIdx) => {
                      const isSubExpanded = expandedSubcategories.has(subcategory.id);
                      const subExpandIcon = isSubExpanded ? '▼' : '▶';
                      const fileIcon = <svg width="14" height="14" viewBox="0 0 18 20" fill="currentColor" style={{color: '#999', marginRight: '6px'}}>
                        <rect x="2" y="2" width="14" height="16" rx="2" fill="#383e49" stroke="#adb5bd"/>
                      </svg>;
                      
                      return (
                        <div key={subcategory.id}>
                          {/* Subcategory Header */}
                          <div
                            class="px-4 py-2 d-flex align-items-center"
                            style={{background: '#1e1f26', color: '#c8cad5', fontSize: '0.95em', fontWeight: '500', cursor: 'pointer', userSelect: 'none'}}
                            onClick={() => toggleSubcategory(subcategory.id)}
                          >
                            <span style={{marginRight: '6px', fontSize: '10px', color: '#999'}}>{subExpandIcon}</span>
                            {fileIcon}
                            <span>{subcategory.name}</span>
                            <span class="ms-auto" style={{color: '#999', fontSize: '0.85em'}}>
                              {subOps.length} операций
                            </span>
                          </div>
                          {/* Operations in Subcategory */}
                          {isSubExpanded && subOps.map(op => (
                            <div key={op.id} class="px-5 py-2" style={{borderTop: '1px solid #2a2a2a'}}>
                              <div class="d-flex justify-content-between align-items-center">
                                <div style={{color: '#999', fontSize: '0.9em'}}>
                                  {new Date(op.date).toLocaleDateString('ru-RU')}
                                </div>
                                <div style={{color: '#e6e8eb', fontSize: '1.1em', fontWeight: 'bold'}}>
                                  {formatValue(op.value)}
                                </div>
                              </div>
                            </div>
                          ))}
                          {subIdx < subcategories.length - 1 && (
                            <div style={{borderBottom: '1px solid #2a2a2a'}}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div style={{position:'fixed',zIndex:1040,inset:0,background:'#18191aee',backdropFilter:'blur(2px)', pointerEvents:'auto'}}/>
          <div style={{position:'fixed',zIndex:1050,top:0,left:0,width:'100vw',height:'100vh', display:'flex',justifyContent:'center',alignItems:'center'}}>
            <div class="bg-dark rounded px-4 py-3 shadow-lg" style={{minWidth:400, maxWidth:500}}>
              <h5 class="mb-3" style={{color:'#e6e8eb'}}>Новая операция</h5>
              
              <div class="mb-3">
                <label class="form-label" style={{color:'#e6e8eb', marginBottom: '8px'}}>Подкатегория</label>
                <select
                  class="form-select"
                  style={{background:'#23242c', color:'#e6e8eb', border:'1px solid #444'}}
                  value={newOperationSubcategory || ''}
                  disabled={saving}
                  onChange={(e: Event) => setNewOperationSubcategory(e.target && (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null)}
                >
                  <option value="">Выберите подкатегорию</option>
                  {subcategories.map(sub => {
                    const cat = categories.find(c => c.id === sub.category_id);
                    return (
                      <option key={sub.id} value={sub.id}>
                        {cat ? `${cat.name} / ${sub.name}` : sub.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label" style={{color:'#e6e8eb', marginBottom: '8px'}}>Дата</label>
                <input
                  class="form-control"
                  type="date"
                  value={newOperationDate}
                  style={{background:'#23242c', color:'#e6e8eb', border:'1px solid #444'}}
                  disabled={saving}
                  onInput={(e) => setNewOperationDate((e.target as HTMLInputElement).value)}
                />
              </div>

              <div class="mb-3">
                <label class="form-label" style={{color:'#e6e8eb', marginBottom: '8px'}}>Сумма (руб.)</label>
                <input
                  class="form-control"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newOperationValue}
                  style={{background:'#23242c', color:'#e6e8eb', border:'1px solid #444'}}
                  disabled={saving}
                  onInput={(e) => setNewOperationValue((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => (e.key === 'Enter' ? saveOperation() : undefined)}
                  autoFocus
                  placeholder="0.00"
                />
              </div>

              {error && <div class="text-danger small mb-2">{error}</div>}

              <div class="d-flex gap-2 justify-content-end">
                <button class="btn btn-secondary" style={{background:'#373a42'}} onClick={() => setShowModal(false)} disabled={saving}>
                  Отмена
                </button>
                <button class="btn btn-primary" style={{background:'#3e62ad'}} onClick={saveOperation} disabled={saving}>
                  Создать
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Operations;
