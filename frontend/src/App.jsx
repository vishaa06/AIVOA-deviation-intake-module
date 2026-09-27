import DeviationForm from './components/DeviationForm'
import AIPanel from './components/AIPanel'

export default function App() {
  return (
    <div className="page">
      <div className="grid">
        <DeviationForm />
        <AIPanel />
      </div>
    </div>
  )
}
