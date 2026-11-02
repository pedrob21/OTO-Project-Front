import { createBrowserRouter, RouterProvider } from 'react-router'
import { Providers } from './Providers'
import { rotas } from './rotas'

const router = createBrowserRouter(rotas)

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
