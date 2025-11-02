import { useState } from "preact/hooks";
import Sidebar, { CurrentPage } from "./components/sidebar/sidebar";
import Analytic from "./components/pages/analytic";
import Operations from "./components/pages/operations";
import Categories from "./components/pages/categories";
import "./App.css";

function App() {
  const [page, setPage] = useState(CurrentPage.Analytic);

  let PageComp;
  if (page === CurrentPage.Analytic) PageComp = Analytic;
  else if (page === CurrentPage.Operations) PageComp = Operations;
  else PageComp = Categories;

  return (
    <main class="container-fluid min-vh-100 text-center ">
      <div class="row min-vh-100 flex-nowrap" style={{background:'#222426'}}>
        <div class="col-2 col-auto px-0" style={{background:'#18191A'}}>
          <Sidebar currentPage={page} setCurrentPage={setPage} />
        </div>
        <div class="col py-3 text-start">
          <PageComp />
        </div>
      </div>
    </main>
  );
}

export default App;
