'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Step {
  id: string
  label: string
  description: string
  complete: boolean
  actionUrl: string | null
}

export function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [fullyComplete, setFullyComplete] = useState(false)

  useEffect(() => {
    const isDismissed = localStorage.getItem('canopy_onboarding_dismissed') === 'true'
    if (isDismissed) {
      setDismissed(true)
      setLoaded(true)
      return
    }

    fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.steps) {
          setSteps(data.steps)
          const allDone = data.steps.every((s: Step) => s.complete)
          setFullyComplete(allDone)
          if (allDone) {
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
              setDismissed(true)
              localStorage.setItem('canopy_onboarding_dismissed', 'true')
            }, 5000)
          }
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('canopy_onboarding_dismissed', 'true')
  }

  if (!loaded || dismissed) return null

  const completeCount = steps.filter((s) => s.complete).length
  const total = steps.length
  const pct = total === 0 ? 0 : Math.round((completeCount / total) * 100)

  if (fullyComplete) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 flex items-center gap-4">
        <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-green-800">You&apos;re fully covered!</p>
          <p className="text-sm text-green-700">All setup steps are complete. Your agents are monitored and covered.</p>
        </div>
        <button onClick={dismiss} className="text-green-600 hover:text-green-800 p-1">
          <X size={16} />
        </button>
      </div>
    )
  }

  // Don't show if all 7 steps are complete
  if (completeCount === total && total > 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[#1a1a2e] text-lg">Get covered in {total} steps</h2>
          <p className="text-sm text-gray-500 mt-0.5">{completeCount} of {total} complete</p>
        </div>
        <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1">
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[#5DCAA5] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3">
            {step.complete ? (
              <CheckCircle2 size={20} className="text-[#5DCAA5] flex-shrink-0 mt-0.5" />
            ) : (
              <Circle size={20} className="text-gray-300 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${step.complete ? 'text-gray-400 line-through' : 'text-[#1a1a2e]'}`}>
                  {step.label}
                </span>
                {!step.complete && step.actionUrl && (
                  <Link
                    href={step.actionUrl}
                    className="text-xs text-[#5DCAA5] hover:underline flex items-center gap-0.5 ml-1"
                  >
                    Go <ChevronRight size={12} />
                  </Link>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
