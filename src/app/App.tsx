import { lazy, Suspense } from 'react'
import { Redirect, Route, Switch } from 'wouter'
import { AppLayout } from '../layouts/AppLayout'
import { PwaUpdatePrompt } from '../components/feedback/PwaUpdatePrompt'
import { WorkoutStartProvider } from '../features/workout-session/WorkoutStartProvider'

const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const WorkoutsPage = lazy(() => import('../pages/workouts/WorkoutsPage').then((module) => ({ default: module.WorkoutsPage })))
const WorkoutBuilderPage = lazy(() => import('../pages/workout-builder/WorkoutBuilderPage').then((module) => ({ default: module.WorkoutBuilderPage })))
const ActiveWorkoutPage = lazy(() => import('../pages/active-workout/ActiveWorkoutPage').then((module) => ({ default: module.ActiveWorkoutPage })))
const StatisticsPage = lazy(() => import('../pages/statistics/StatisticsPage').then((module) => ({ default: module.StatisticsPage })))
const ChartsPage = lazy(() => import('../pages/charts/ChartsPage').then((module) => ({ default: module.ChartsPage })))
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))

export default function App() {
  return (
    <WorkoutStartProvider>
      <AppLayout>
        <Suspense fallback={<div className="route-loader"><div className="loading-orb" /></div>}>
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/workouts/new" component={WorkoutBuilderPage} />
            <Route path="/workouts/:templateId/edit" component={WorkoutBuilderPage} />
            <Route path="/workouts/history" component={WorkoutsPage} />
            <Route path="/workouts" component={WorkoutsPage} />
            <Route path="/session/:sessionId" component={ActiveWorkoutPage} />
            <Route path="/statistics" component={StatisticsPage} />
            <Route path="/charts" component={ChartsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route><Redirect to="/" /></Route>
          </Switch>
        </Suspense>
      </AppLayout>
      <PwaUpdatePrompt />
    </WorkoutStartProvider>
  )
}
