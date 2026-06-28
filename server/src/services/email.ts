import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  }
  return transporter
}

export async function sendOtpEmail(to: string, otp: string, purpose: string): Promise<void> {
  const transport = getTransporter()
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `SocialPostAgent — ${purpose}`,
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${otp}</p>
      <p>This code expires in 10 minutes.</p>
    `,
  })
}
