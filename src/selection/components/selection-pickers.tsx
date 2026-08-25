import { Navigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Picker } from '@/selection/components/picker'
import { usePickerSelections } from '@/selection/hooks/use-picker-selections'

export function SelectionPickers() {
  const { environment, failure, project, searchWithDefaultOption, service, status } =
    usePickerSelections()

  return (
    <div className="mt-8 space-y-5">
      {searchWithDefaultOption && <Navigate to="/" search={searchWithDefaultOption} replace />}
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8f8c81]">
          Project / Environment / Service
        </p>
        <h3 className="mt-2 text-2xl leading-tight">Choose a service</h3>
      </div>
      <Picker {...project} />
      <Picker {...environment} />
      <Picker {...service} />
      <p
        id="selection-status"
        aria-label="Selection status"
        role="status"
        className="text-sm leading-6 text-[#c9c5b9]"
      >
        {status}
      </p>
      {failure && (
        <div className="border-l-2 border-[#d97767] bg-[#2d201e] px-4 py-3">
          <p role="alert" className="text-sm leading-6 text-[#f0b8ae]">
            {failure.message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 border-[#d97767] bg-transparent text-[#f0b8ae]"
            onClick={failure.retry}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
