import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'preact/compat';
import { invoke } from '@tauri-apps/api/core';

// Define interfaces for our data types
interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

interface Operation {
  id: number;
  subcategory_id: number;
  date: string;
  value: number;
}

// Define the shape of our global state
interface DataState {
  categories: Category[];
  subcategories: Subcategory[];
  operations: Operation[];
  loading: boolean;
  error: string | null;
}

// Define the context type
interface DataContextType extends DataState {
  refreshCategories: () => Promise<void>;
  refreshSubcategories: () => Promise<void>;
  refreshOperations: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setSubcategories: Dispatch<SetStateAction<Subcategory[]>>;
  setOperations: Dispatch<SetStateAction<Operation[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

// Create the context with default values
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh categories
  const refreshCategories = async () => {
    try {
      const result = await invoke<Category[]>('list_categories');
      setCategories(result);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err instanceof Error ? err.message : 'Error loading categories');
    }
  };

  // Function to refresh subcategories
  const refreshSubcategories = async () => {
    try {
      const result = await invoke<Subcategory[]>('list_subcategories');
      setSubcategories(result);
    } catch (err) {
      console.error('Error loading subcategories:', err);
      setError(err instanceof Error ? err.message : 'Error loading subcategories');
    }
  };

  // Function to refresh operations
  const refreshOperations = async () => {
    try {
      const result = await invoke<Operation[]>('list_operations', {});
      setOperations(result);
    } catch (err) {
      console.error('Error loading operations:', err);
      setError(err instanceof Error ? err.message : 'Error loading operations');
    }
  };

  // Function to refresh all data
  const refreshAll = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load all data in parallel
      const [categoriesResult, subcategoriesResult, operationsResult] = await Promise.all([
        invoke<Category[]>('list_categories'),
        invoke<Subcategory[]>('list_subcategories'),
        invoke<Operation[]>('list_operations', {})
      ]);
      
      setCategories(categoriesResult);
      setSubcategories(subcategoriesResult);
      setOperations(operationsResult);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Load all data on initial render
  useEffect(() => {
    refreshAll();
  }, []);

  // Provide the context value
  const contextValue: DataContextType = {
    categories,
    subcategories,
    operations,
    loading,
    error,
    refreshCategories,
    refreshSubcategories,
    refreshOperations,
    refreshAll,
    setCategories,
    setSubcategories,
    setOperations,
    setLoading,
    setError
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook to use the data context
export const useData = (): DataContextType => {
 const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};