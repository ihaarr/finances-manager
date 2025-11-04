import "./sidebar.css"

export enum CurrentPage {
  Analytic = 'analytic',
  Operations = 'operations',
  Categories = 'categories'
}

interface Props {
  currentPage: CurrentPage;
  setCurrentPage: (page: CurrentPage) => void;
}

export default function Sidebar({ currentPage, setCurrentPage }: Props) {
  return (
    <div class="d-flex flex-column align-items-start p-3 h-100" style={{minWidth: '185px'}}>
      <button 
        type="button" 
        class={`btn text-start w-100 fw-bold mb-2 ${currentPage === CurrentPage.Analytic ? 'btn-light text-white' : 'btn-link text-secondary'}`}
        style={currentPage === CurrentPage.Analytic ? {background: '#252526'} : {}}
        onClick={() => setCurrentPage(CurrentPage.Analytic)}
      >
        Аналитика
      </button>
      <button 
        type="button" 
        class={`btn text-start w-100 fw-bold mb-2 ${currentPage === CurrentPage.Operations ? 'btn-light text-white' : 'btn-link text-secondary'}`}
        style={currentPage === CurrentPage.Operations ? {background: '#252526'} : {}}
        onClick={() => setCurrentPage(CurrentPage.Operations)}
      >
        Операции
      </button>
      <button 
        type="button" 
        class={`btn text-start w-100 fw-bold ${currentPage === CurrentPage.Categories ? 'btn-light text-white' : 'btn-link text-secondary'}`}
        style={currentPage === CurrentPage.Categories ? {background: '#59595c'} : {}}
        onClick={() => setCurrentPage(CurrentPage.Categories)}
      >
        Категории
      </button>
    </div>
  );
}
