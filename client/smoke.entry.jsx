import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './src/App';

export function mountAt(path) {
  window.history.pushState({}, '', path);
  const host = document.createElement('div');
  document.getElementById('root').replaceChildren(host);
  const root = createRoot(host);
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  return () => root.unmount();
}
