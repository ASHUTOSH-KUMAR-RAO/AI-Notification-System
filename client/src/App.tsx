import { lazy, Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Backdrop } from '@/components/Backdrop'
import { CookieNotice } from '@/components/CookieNotice'
import { ScrollManager } from '@/components/ScrollManager'
import { FullPageLoader } from '@/components/FullPageLoader'
import { ProtectedRoute, PublicRoute } from '@/components/RouteGuards'
import { AppShell } from '@/components/shell/AppShell'
import { PublicLayout } from '@/components/shell/PublicLayout'
import { AuthProvider } from '@/context/AuthContext'
import { SocketProvider } from '@/context/SocketContext'

const Home = lazy(() => import('@/pages/Home'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Settings = lazy(() => import('@/pages/Settings'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))
const Cookies = lazy(() => import('@/pages/Cookies'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export default function App() {
  return (
    <MotionConfig reducedMotion="never">
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Backdrop />
          <ScrollManager />
          <CookieNotice />
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
            Skip to content
          </a>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route element={<PublicRoute />}>
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                </Route>
                <Route path="privacy" element={<Privacy />} />
                <Route path="terms" element={<Terms />} />
                <Route path="cookies" element={<Cookies />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
    </MotionConfig>
  )
}
