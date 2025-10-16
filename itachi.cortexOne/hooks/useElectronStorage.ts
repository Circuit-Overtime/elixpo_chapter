import { useState, useEffect, useCallback } from 'react';

function useElectronStorage<T>(
  key: string, 
  initialValue: T,
  electronGetter: () => Promise<T | null>,
  electronSetter: (value: T) => Promise<{ success: boolean; error?: string }>
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      if (window.desktopApi) {
        try {
          const value = await electronGetter();
          if (value !== null) {
            setStoredValue(value);
          }
        } catch (error) {
          console.error(`Error loading ${key} from electron store:`, error);
          // Fallback to localStorage
          try {
            const item = window.localStorage.getItem(key);
            if (item) {
              setStoredValue(JSON.parse(item));
            }
          } catch (localError) {
            console.error(`Error loading ${key} from localStorage:`, localError);
          }
        }
      } else {
        // Web fallback - use localStorage
        try {
          const item = window.localStorage.getItem(key);
          if (item) {
            setStoredValue(JSON.parse(item));
          }
        } catch (error) {
          console.error(`Error loading ${key} from localStorage:`, error);
        }
      }
      setIsLoaded(true);
    };

    loadValue();
  }, [key, electronGetter]);

  // Save value when it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save initial load

    const saveValue = async () => {
      if (window.desktopApi) {
        try {
          const result = await electronSetter(storedValue);
          if (!result.success) {
            console.error(`Error saving ${key} to electron store:`, result.error);
            // Fallback to localStorage
            window.localStorage.setItem(key, JSON.stringify(storedValue));
          }
        } catch (error) {
          console.error(`Error saving ${key} to electron store:`, error);
          // Fallback to localStorage
          try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
          } catch (localError) {
            console.error(`Error saving ${key} to localStorage:`, localError);
          }
        }
      } else {
        // Web fallback - use localStorage
        try {
          window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
          console.error(`Error saving ${key} to localStorage:`, error);
        }
      }
    };

    // Debounce saves to prevent excessive writes
    const timeoutId = setTimeout(saveValue, 100);
    return () => clearTimeout(timeoutId);
  }, [key, storedValue, electronSetter, isLoaded]);

  return [storedValue, setStoredValue];
}

export default useElectronStorage;