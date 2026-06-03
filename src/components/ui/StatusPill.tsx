const statusConfig: Record<string, { label: string; classes: string }> = {
  // Agent statuses
  active: { label: 'Active', classes: 'bg-green-100 text-green-800' },
  review: { label: 'Under Review', classes: 'bg-yellow-100 text-yellow-800' },
  suspended: { label: 'Suspended', classes: 'bg-red-100 text-red-800' },
  // Claim statuses
  submitted: { label: 'Submitted', classes: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review', classes: 'bg-yellow-100 text-yellow-800' },
  pending_docs: { label: 'Pending Docs', classes: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Approved', classes: 'bg-green-100 text-green-800' },
  denied: { label: 'Denied', classes: 'bg-red-100 text-red-800' },
  paid: { label: 'Paid', classes: 'bg-teal-100 text-teal-800' },
  // Policy statuses
  pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
  expired: { label: 'Expired', classes: 'bg-gray-100 text-gray-800' },
  canceled: { label: 'Canceled', classes: 'bg-red-100 text-red-800' },
  // Risk levels
  low: { label: 'Low Risk', classes: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium Risk', classes: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High Risk', classes: 'bg-red-100 text-red-800' },
  // Plans
  none: { label: 'No Plan', classes: 'bg-gray-100 text-gray-600' },
  starter: { label: 'Starter', classes: 'bg-blue-100 text-blue-800' },
  growth: { label: 'Growth', classes: 'bg-purple-100 text-purple-800' },
  enterprise: { label: 'Enterprise', classes: 'bg-teal-100 text-teal-800' },
}

export function StatusPill({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, classes: 'bg-gray-100 text-gray-800' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  )
}
