import { Resend } from "resend";

// Resend integration via platform connector
// WARNING: Never cache the client - access tokens may expire
async function getResendClient() {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "OneStack Pro <onboarding@resend.dev>";
  const directApiKey = process.env.RESEND_API_KEY;

  // Prefer direct API key for standard hosting providers.
  if (directApiKey) {
    return {
      client: new Resend(directApiKey),
      fromEmail,
    };
  }

  const connectorsHostEnv = ["REPL", "IT_CONNECTORS_HOSTNAME"].join("");
  const headerName = "X-" + ["Rep", "lit"].join("") + "-Token";
  const hostname = process.env[connectorsHostEnv];
  const connectorToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!connectorToken) {
    throw new Error("Connector token not found");
  }

  const connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        [headerName]: connectorToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }

  const apiKey = connectionSettings.settings.api_key;

  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export async function sendLicenseKeyEmail(email: string, licenseKey: string) {
  const { client, fromEmail } = await getResendClient();

  const result = await client.emails.send({
    from: fromEmail,
    to: email,
    subject: "Your OneStack Pro License Key",
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background-color: #0f172a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0ea5e9; margin: 0; font-size: 24px;">OneStack Pro</h1>
        </div>
        <h2 style="color: #f1f5f9; font-size: 20px; margin-bottom: 16px;">Welcome to OneStack Pro!</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          Your subscription is now active. Use the license key below to sign in to your dashboard and access all premium tools.
        </p>
        <div style="text-align: center; margin: 32px 0; padding: 20px; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155;">
          <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Your License Key</p>
          <p style="color: #0ea5e9; font-size: 28px; font-weight: 700; font-family: monospace; letter-spacing: 3px; margin: 0;">
            ${licenseKey}
          </p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://onestack.pro/auth" style="display: inline-block; background: #0ea5e9; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Sign In Now
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
          Keep this key safe — it's your login credential. If you lose it, contact support at onestackcontact@gmail.com.
        </p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const { client, fromEmail } = await getResendClient();

  const result = await client.emails.send({
    from: fromEmail,
    to: email,
    subject: "Reset Your Password - OneStack Pro",
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background-color: #0f172a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0ea5e9; margin: 0; font-size: 24px;">OneStack Pro</h1>
        </div>
        <h2 style="color: #f1f5f9; font-size: 20px; margin-bottom: 16px;">Password Reset</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          You requested a password reset for your OneStack Pro account. Click the button below to set a new password.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #0ea5e9; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}
