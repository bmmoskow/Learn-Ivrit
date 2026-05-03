import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AdminAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured - email not sent");
      return new Response(
        JSON.stringify({ success: false, reason: "Email service not configured" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!adminEmail) {
      console.warn("ADMIN_EMAIL not configured - email not sent");
      return new Response(
        JSON.stringify({ success: false, reason: "Admin email not configured" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const alert: AdminAlert = await req.json();

    const severityEmoji: Record<string, string> = {
      info: "ℹ️",
      warning: "⚠️",
      critical: "🚨",
    };

    const emoji = severityEmoji[alert.severity] || "📢";

    const emailHtml = `
      <h2>${emoji} ${alert.title}</h2>
      <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
      <p><strong>Type:</strong> ${alert.alert_type}</p>
      <p><strong>Time:</strong> ${new Date(alert.created_at).toLocaleString()}</p>
      <hr />
      <h3>Details:</h3>
      <p>${alert.message.replace(/\n/g, "<br>")}</p>
      ${alert.metadata && Object.keys(alert.metadata).length > 0 ? `
        <hr />
        <h3>Additional Information:</h3>
        <ul>
          ${Object.entries(alert.metadata)
            .filter(([key]) => !['send_email', 'month'].includes(key))
            .map(([key, value]) => {
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
              return `<li><strong>${formattedKey}:</strong> ${formattedValue}</li>`;
            })
            .join('\n          ')}
        </ul>
      ` : ''}
      <hr />
      <p><small>Alert ID: ${alert.id}</small></p>
      <p><small>Please log in to your admin dashboard to take action if needed.</small></p>
    `;

    const emailText = `
${emoji} ${alert.title}

Severity: ${alert.severity.toUpperCase()}
Type: ${alert.alert_type}
Time: ${new Date(alert.created_at).toLocaleString()}

Details:
${alert.message}

${alert.metadata && Object.keys(alert.metadata).length > 0 ? `
Additional Information:
${Object.entries(alert.metadata)
  .filter(([key]) => !['send_email', 'month'].includes(key))
  .map(([key, value]) => {
    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
    return `- ${formattedKey}: ${formattedValue}`;
  })
  .join('\n')}
` : ''}

---
Alert ID: ${alert.id}
Please log in to your admin dashboard to take action if needed.
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "TorahTutor Alerts <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `[TorahTutor Alert] ${alert.title}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${resendResponse.status}`);
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
