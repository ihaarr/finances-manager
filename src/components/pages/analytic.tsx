import { FunctionalComponent } from 'preact';
import { useData } from '../../context/DataContext';

const Analytic: FunctionalComponent = () => {
  const { categories, subcategories, operations, loading } = useData();

  if (loading) {
    return (
      <div class="container py-5 text-center">
        <h1 class="display-4">Аналитика</h1>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  // Calculate some basic analytics
  const totalOperations = operations.length;
  const totalCategories = categories.length;
  const totalSubcategories = subcategories.length;
  const totalAmount = operations.reduce((sum, op) => sum + op.value, 0);

  return (
    <div class="container py-4" style={{color: '#e6e8eb'}}>
      <h1 class="display-4 mb-4">Аналитика</h1>
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
                {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(totalAmount / 100)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <h3>Последние операции</h3>
          <div class="table-responsive">
            <table class="table table-dark">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Подкатегория</th>
                  <th>Категория</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {operations.slice(0, 10).map(op => {
                  const subcategory = subcategories.find(s => s.id === op.subcategory_id);
                  const category = subcategory ? categories.find(c => c.id === subcategory.category_id) : null;
                  return (
                    <tr key={op.id}>
                      <td>{new Date(op.date).toLocaleDateString('ru-RU')}</td>
                      <td>{subcategory ? subcategory.name : 'N/A'}</td>
                      <td>{category ? category.name : 'N/A'}</td>
                      <td>{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(op.value / 100)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytic;
