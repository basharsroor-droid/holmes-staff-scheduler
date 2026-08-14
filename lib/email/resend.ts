export async function sendEmail(input: { to: string; subject: string; html: string; idempotencyKey: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY or EMAIL_FROM is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html })
  });
  const body = await response.json() as { id?: string; message?: string };
  if (!response.ok || !body.id) throw new Error(body.message || `Resend returned ${response.status}`);
  return body.id;
}
