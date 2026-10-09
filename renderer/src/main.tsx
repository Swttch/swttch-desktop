import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { PATH } from './routes';
import { App } from './App';
import { SidebarStateProvider } from './SidebarState';
import './shell.css';
import 'tippy.js/dist/tippy.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing React root');
const router = createBrowserRouter([{ path: PATH.HOME, element: <App />, children: [{ index: true }, { path: PATH.PROJECTS }, { path: PATH.PROJECT }] }]);
createRoot(root).render(<QueryClientProvider client={queryClient}><SidebarStateProvider><RouterProvider router={router} /></SidebarStateProvider></QueryClientProvider>);
