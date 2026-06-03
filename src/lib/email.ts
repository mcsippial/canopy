import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM_EMAIL = 'Canopy <noreply@canopy.ai>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function sendClaimConfirmation(opts: {
  to: string
  claimantName: string
  claimNumber: string
  statusToken: string
}) {
  try {
    const resend = getResend()
    const statusUrl = `${APP_URL}/claim/status/${opts.statusToken}`

    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      subject: `Your claim ${opts.claimNumber} has been received — Canopy`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 20px; font-weight: bold; color: #1a1a2e;">Canopy</span>
          </div>
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Claim Received</h1>
          <p style="color: #4b5563; line-height: 1.6;">Hi ${opts.claimantName},</p>
          <p style="color: #4b5563; line-height: 1.6;">
            We've received your claim <strong>${opts.claimNumber}</strong> and it is now under review.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            You can track the status of your claim at any time using the link below:
          </p>
          <div style="margin: 32px 0;">
            <a href="${statusUrl}" style="background: #5DCAA5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Track your claim
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Claim reference: ${opts.claimNumber}<br/>
            If you have questions, reply to this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Canopy — Protection for the agentic era</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Failed to send claim confirmation email:', err)
  }
}

export async function sendClaimAlert(opts: {
  adminEmails: string[]
  claimNumber: string
  amountClaimed: number
  claimantName: string
  agentName?: string
  dashboardUrl: string
}) {
  try {
    const resend = getResend()

    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.adminEmails,
      subject: `New claim ${opts.claimNumber} submitted — Canopy`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 20px; font-weight: bold; color: #1a1a2e;">Canopy</span>
          </div>
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">New Claim Submitted</h1>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #4b5563;"><strong>Claim #:</strong> ${opts.claimNumber}</p>
            <p style="margin: 0 0 8px; color: #4b5563;"><strong>Claimant:</strong> ${opts.claimantName}</p>
            <p style="margin: 0 0 8px; color: #4b5563;"><strong>Amount claimed:</strong> $${opts.amountClaimed.toLocaleString()}</p>
            ${opts.agentName ? `<p style="margin: 0; color: #4b5563;"><strong>Agent:</strong> ${opts.agentName}</p>` : ''}
          </div>
          <a href="${opts.dashboardUrl}" style="background: #1a1a2e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View in dashboard
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Canopy — Protection for the agentic era</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Failed to send claim alert email:', err)
  }
}
