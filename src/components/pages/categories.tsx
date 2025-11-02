import { FunctionalComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
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

const folderIcon = <span class="me-2" role="img" aria-label="folder">
  <svg width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="5" width="18" height="13" rx="2" fill="#23272e"/><rect x="1" y="3" width="6" height="4" rx="1.5" fill="#3b4252"/></svg>
</span>;
const fileIcon = <span class="me-2" role="img" aria-label="file">
  <svg width="18" height="20" viewBox="0 0 18 20"><rect x="2" y="2" width="14" height="16" rx="2" fill="#383e49" stroke="#24272A"/></svg>
</span>;

const Categories: FunctionalComponent = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  // Dialog state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState<number | null>(null);
  // Input state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function refresh() {
    invoke<Category[]>("list_categories").then(setCategories);
    invoke<Subcategory[]>("list_subcategories").then(setSubcategories);
  }
  useEffect(() => {
    refresh();
  }, []);
  function subsForCat(catId: number) {
    return subcategories.filter(s => s.category_id === catId);
  }
  function onAddCategory() {
    setNewCategoryName(""); setError(""); setShowCategoryModal(true);
  }
  function onAddSubcategory(categoryId: number) {
    setSubcategoryCategoryId(categoryId); setNewSubcategoryName(""); setError(""); setShowSubcategoryModal(true);
  }

  // Create handlers (backend)
  async function saveCategory() {
    if (!newCategoryName.trim()) return setError("Введите название категории");
    setSaving(true); setError("");
    try {
      await invoke("create_category", { name: newCategoryName.trim() });
      setShowCategoryModal(false); refresh();
    } catch (e: any) {
      setError(e.toString());
    } finally { setSaving(false); }
  }
  async function saveSubcategory() {
    if (!newSubcategoryName.trim()) return setError("Введите название подкатегории");
    setSaving(true); setError("");
    try {
      await invoke("create_subcategory", { categoryId: subcategoryCategoryId, name: newSubcategoryName.trim() });
      setShowSubcategoryModal(false); refresh();
    } catch (e: any) {
      setError(e.toString());
    } finally { setSaving(false); }
  }

  // Modal dialogs
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

  return (
    <div class="container py-4" style={{color: '#e6e8eb'}}>
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h2 class="fw-bold mb-0" style={{color: '#e6e8eb', background: 'transparent', fontSize: '2.3rem'}}>Категории</h2>
        <button class="btn btn-primary" style={{background: '#3e62ad', borderColor: '#345091'}} onClick={onAddCategory}>+ Добавить категорию</button>
      </div>
      <div>
        {categories.map(cat => (
          <div key={cat.id} style={{background: '#23242c', borderRadius: '8px', marginBottom: 12, boxShadow: '0 1px 4px #15151b80'}}>
            <div class="d-flex align-items-center px-3 py-2" style={{color: '#e6e8eb'}}>
              {folderIcon}
              <span class="fw-semibold" style={{color: '#e6e8eb'}}>{cat.name}</span>
              <div class="ms-auto d-flex align-items-center">
                <button class="btn btn-link px-2 py-0" style={{color:'#7ba1ff'}} onClick={() => onAddSubcategory(cat.id)} title="Добавить подкатегорию">
                  <span style={{fontSize: '20px', lineHeight: 1}}>+</span>
                </button>
                <button class="btn btn-link px-2 py-0" style={{color:'#999'}} title="Действия"><b>...</b></button>
              </div>
            </div>
            {subsForCat(cat.id).length > 0 && (
              <div class="ps-4">
                {subsForCat(cat.id).map(sub => (
                  <div key={sub.id} class="d-flex align-items-center px-3 py-2 border-0 bg-transparent" style={{color: '#c8cad5'}}>
                    {fileIcon}
                    <span>{sub.name}</span>
                    <div class="ms-auto">
                      <button class="btn btn-link px-2 py-0" style={{color:'#999'}} title="Действия"><b>...</b></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Modals are rendered outside normal tab order to block background */}
      {(showCategoryModal || showSubcategoryModal) && modalBackdrop}
      {showCategoryModal && CategoryModal()}
      {showSubcategoryModal && SubcategoryModal()}
    </div>
  );
};

export default Categories;
