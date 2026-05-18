let listeners = [];
let loadingCount = 0;

export const state = {
  isLoading: false
};

export const subscribe = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

export const setLoading = (val) => {
  if (val) loadingCount++;
  else loadingCount--;
  
  // Ensure count doesn't go below 0
  if (loadingCount < 0) loadingCount = 0;
  
  const newState = loadingCount > 0;
  if (newState !== state.isLoading) {
    state.isLoading = newState;
    listeners.forEach(l => l(state.isLoading));
  }
};
