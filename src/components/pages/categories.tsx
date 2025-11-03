import { FunctionalComponent } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';

interface Category {
  id: number;
  name: string;
}
interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

type ContextMenu =
  | { type: 'category', id: number, anchor: HTMLElement | null }
  | { type: 'subcategory', id: number, anchor: HTMLElement | null }
  | null;

const folderIcon = <span class="me-2" role="img" aria-label="folder">
  <svg width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="5" width="18" height="13" rx="2" fill="#23272e"/><rect x="1" y="3" width="6" height="4" rx="1.5" fill="#3b4252"/></svg>
</span>;
const fileIcon = <span class="me-2" role="img" aria-label="file">
  <svg width="18" height="20" viewBox="0 0 18 20"><rect x="2" y="2" width="14" height="16" rx="2" fill="#383e49" stroke="#24272A"/></svg>
</span>;

const Categories: FunctionalComponent = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  // Dialog state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState<number | null>(null);
  // Edit modal state
  const [editContext, setEditContext] = useState<{ type: 'category'|'subcategory', id: number, name: string }|null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  // Input state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  // For focus management
  const menuRef = useRef<HTMLDivElement>(null);

  function refresh() {
    invoke<Category[]>("list_categories").then(setCategories);
    invoke<Subcategory[]>("list_subcategories").then(setSubcategories);
  }
  useEffect(() => { refresh(); }, []);
  function subsForCat(catId: number) { return subcategories.filter(s => s.category_id === catId); }
  function onAddCategory() { setNewCategoryName(""); setError(""); setShowCategoryModal(true); }
  function onAddSubcategory(categoryId: number) { setSubcategoryCategoryId(categoryId); setNewSubcategoryName(""); setError(""); setShowSubcategoryModal(true); }
  
  function toggleCategory(catId: number) {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catId)) {
        newSet.delete(catId);
      } else {
        newSet.add(catId);
      }
      return newSet;
    });
  }
  
  // Context menu handlers
  function openContextMenu(type: 'category'|'subcategory', id: number, e: Event) {
    e.preventDefault();
    setContextMenu({type, id, anchor: e.currentTarget as HTMLElement});
  }
  function closeContextMenu() { setContextMenu(null); }
  // Click-away and escape closes context menu
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as any)) closeContextMenu();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeContextMenu(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [contextMenu]);

  // --- Backend CRUD ---
  async function saveCategory() {
    if (!newCategoryName.trim()) return setError("Введите название категории");
    setSaving(true); setError("");
    try { await invoke("create_category", { name: newCategoryName.trim() });
      setShowCategoryModal(false); refresh();
    } catch (e: any) { setError(e.toString()); } finally { setSaving(false); }
  }
  async function saveSubcategory() {
    if (!newSubcategoryName.trim()) return setError("Введите название подкатегории");
    setSaving(true); setError("");
    try { await invoke("create_subcategory", { categoryId: subcategoryCategoryId, name: newSubcategoryName.trim() });
      setShowSubcategoryModal(false); refresh();
    } catch (e: any) { setError(e.toString()); } finally { setSaving(false); }
  }
  async function removeCategory(id: number) {
    await invoke('remove_category', { id }); refresh();
  }
  async function removeSubcategory(id: number) {
    await invoke('remove_subcategory', { id }); refresh();
  }
  // -- Edit Modal --
  function startEdit(type: 'category'|'subcategory', id: number, name: string) {
    setEditName(name); setEditContext({ type, id, name }); closeContextMenu(); setError("");
  }
  async function saveEdit() {
    if (!editName.trim()) return setError('Введите новое имя');
    setSaving(true); setError("");
    try {
      if (editContext?.type === 'category') await invoke('update_category', { id: editContext.id, name: editName.trim() });
      else if (editContext?.type === 'subcategory') await invoke('update_subcategory', { id: editContext.id, name: editName.trim() });
      setEditContext(null); refresh();
    } catch (e: any) { setError(e.toString()); } finally { setSaving(false); }
  }

  // --- Modals ---
  const modalBackdrop = <div style={{position:'fixed',zIndex:1040,inset:0,background:'#18191aee',backdropFilter:'blur(2px)', pointerEvents:'auto'}}/>;
  function CategoryModal() {
    return (
      <div style={{position:'fixed',zIndex:1050,top:0,left:0,width:'100vw',height:'100vh', display:'flex',justifyContent:'center',alignItems:'center'}}>
        <div class="bg-dark rounded px-4 py-3 shadow-lg" style={{minWidth:360, maxWidth:420}}>
          <h5 class="mb-3" style={{color:'#e6e8eb'}}>Новая категория</h5>
          <input
            class="form-control mb-2"
            type="text"
            value={newCategoryName}
            style={{background:'#23242c', color:'#e6e8eb', border:'1px solid #444'}}
            disabled={saving}
            onInput={e => setNewCategoryName((e.target as HTMLInputElement).value)}
            onKeyDown={e => (e.key === 'Enter' ? saveCategory() : undefined)}
            autoFocus
            placeholder="Название категории"
          />
          {error && <div class="text-danger small mb-2">{error}</div>}
          <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-secondary" style={{background:'#373a42'}} onClick={() => setShowCategoryModal(false)} disabled={saving}>Отмена</button>
            <button class="btn btn-primary" style={{background:'#3e62ad'}} onClick={saveCategory} disabled={saving}>Создать</button>
          </div>
        </div>
      </div>
    );
  }
  function SubcategoryModal() {
    return (
      <div style={{position:'fixed',zIndex:1050,top:0,left:0,width:'100vw',height:'100vh', display:'flex',justifyContent:'center',alignItems:'center'}}>
        <div class="bg-dark rounded px-4 py-3 shadow-lg" style={{minWidth:360, maxWidth:440}}>
          <h5 class="mb-3" style={{color:'#e6e8eb'}}>Новая подкатегория</h5>
          <input
            class="form-control mb-2"
            type="text"
            value={newSubcategoryName}
            style={{background:'#23242c', color:'#e6e8eb', border:'1px solid #444'}}
            disabled={saving}
            onInput={e => setNewSubcategoryName((e.target as HTMLInputElement).value)}
            onKeyDown={e => (e.key === 'Enter' ? saveSubcategory() : undefined)}
            autoFocus
            placeholder="Название подкатегории"
          />
          {error && <div class="text-danger small mb-2">{error}</div>}
          <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-secondary" style={{background:'#373a42'}} onClick={() => setShowSubcategoryModal(false)} disabled={saving}>Отмена</button>
            <button class="btn btn-primary" style={{background:'#3e62ad'}} onClick={saveSubcategory} disabled={saving}>Создать</button>
          </div>
        </div>
      </div>
    );
  }
  function EditModal() {
    if (!editContext) return null;
    const title = editContext.type === 'category' ? 'Редактировать категорию' : 'Редактировать подкатегорию';
    return (
      <div style={{position:'fixed',zIndex:1050,top:0,left:0,width:'100vw',height:'100vh', display:'flex',justifyContent:'center',alignItems:'center'}}>
        <div class="bg-dark rounded px-4 py-3 shadow-lg" style={{minWidth:360, maxWidth:440}}>
          <h5 class="mb-3" style={{color:'#e6e8eb'}}>{title}</h5>
          <input
            class="form-control mb-2"
            type="text"
            value={editName}
            style={{background:'#23242c', color:'#e6e8eb', border:'1px solid #444'}}
            disabled={saving}
            onInput={e => setEditName((e.target as HTMLInputElement).value)}
            onKeyDown={e => (e.key === 'Enter' ? saveEdit() : undefined)}
            autoFocus
            placeholder="Новое имя"
          />
          {error && <div class="text-danger small mb-2">{error}</div>}
          <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-secondary" style={{background:'#373a42'}} onClick={() => setEditContext(null)} disabled={saving}>Отмена</button>
            <button class="btn btn-primary" style={{background:'#3e62ad'}} onClick={saveEdit} disabled={saving}>Сохранить</button>
          </div>
        </div>
      </div>
    );
  }
  // --- ContextMenu UI ---
  function ContextMenuPopup() {
    if (!contextMenu) return null;
    // Find coordinates
    const anchor = contextMenu.anchor;
    let style: any = { position: 'fixed', zIndex: 2001, minWidth: 120, background: '#18191a', border: '1px solid #333', color: '#e6e8eb', borderRadius: 8, boxShadow: '0 2px 7px #000a', padding: '4px 0' };
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      style.left = rect.right - 30; // to right of three-dots
      style.top = rect.bottom + 3;
    }
    return (
      <div ref={menuRef} style={style}>
        <button class="dropdown-item" style={{background:'transparent',color:'#e6e8eb',border:'none',width:'100%',textAlign:'left'}} onClick={() => {
          if(contextMenu.type==='category') startEdit('category', contextMenu.id, categories.find(c=>c.id===contextMenu.id)?.name||'')
          else startEdit('subcategory', contextMenu.id, subcategories.find(s=>s.id===contextMenu.id)?.name||'')
        }}>Редактировать</button>
        <button class="dropdown-item" style={{background:'transparent',color:'#e25e5e',border:'none',width:'100%',textAlign:'left'}} onClick={() => {
          if(contextMenu.type==='category') removeCategory(contextMenu.id);
          else removeSubcategory(contextMenu.id);
          closeContextMenu();
        }}>Удалить</button>
      </div>
    )
  }

  return (
    <div class="container py-4" style={{color: '#e6e8eb'}}>
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h2 class="fw-bold mb-0" style={{color: '#e6e8eb', background: 'transparent', fontSize: '2.3rem'}}>Категории</h2>
        <button class="btn btn-primary" style={{background: '#3e62ad', borderColor: '#345091'}} onClick={onAddCategory}>+ Добавить категорию</button>
      </div>
      <div>
        {categories.map(cat => {
          const isExpanded = expandedCategories.has(cat.id);
          const hasSubcategories = subsForCat(cat.id).length > 0;
          return (
            <div key={cat.id} style={{background: '#23242c', borderRadius: '8px', marginBottom: 12, boxShadow: '0 1px 4px #15151b80'}}>
              <div class="d-flex align-items-center px-3 py-2" style={{color: '#e6e8eb'}}>
                {hasSubcategories && (
                  <button
                    class="btn btn-link px-2 py-0 me-1"
                    style={{color:'#999', padding: '0 4px'}}
                    onClick={() => toggleCategory(cat.id)}
                    title={isExpanded ? "Свернуть" : "Развернуть"}
                  >
                    <span style={{fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      {isExpanded ? '▼' : '►'}
                    </span>
                  </button>
                )}
                {folderIcon}
                <span class="fw-semibold" style={{color: '#e6e8eb'}}>{cat.name}</span>
                <div class="ms-auto d-flex align-items-center">
                  <button class="btn btn-link px-2 py-0" style={{color:'#7ba1ff'}} onClick={() => onAddSubcategory(cat.id)} title="Добавить подкатегорию">
                    <span style={{fontSize: '20px', lineHeight: 1}}>+</span>
                  </button>
                  <button class="btn btn-link px-2 py-0" style={{color:'#999', position:'relative'}} title="Действия" onClick={e => openContextMenu('category', cat.id, e)}><b>...</b></button>
                </div>
              </div>
              {isExpanded && hasSubcategories && (
                <div class="ps-4">
                  {subsForCat(cat.id).map(sub => (
                    <div key={sub.id} class="d-flex align-items-center px-3 py-2 border-0 bg-transparent" style={{color: '#c8cad5'}}>
                      {fileIcon}
                      <span>{sub.name}</span>
                      <div class="ms-auto">
                        <button class="btn btn-link px-2 py-0" style={{color:'#999', position:'relative'}} title="Действия" onClick={e => openContextMenu('subcategory', sub.id, e)}><b>...</b></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {(showCategoryModal || showSubcategoryModal || editContext) && modalBackdrop}
      {showCategoryModal && CategoryModal()}
      {showSubcategoryModal && SubcategoryModal()}
      {editContext && EditModal()}
      {ContextMenuPopup()}
    </div>
  );
};

export default Categories;
