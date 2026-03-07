import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactFormData {
  user_id: string | null;
  name: string;
  email: string;
  message_type: string;
  message: string;
}

interface ContactSubmission {
  id: string;
  created_at: string;
  user_id: string | null;
  name: string;
  email: string;
  message_type: string;
  message: string;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    if (!adminEmail) {
      throw new Error("ADMIN_EMAIL not configured - please set this to your email address");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const formData: ContactFormData = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: submission, error: dbError } = await supabase
      .from("contact_submissions")
      .insert({
        user_id: formData.user_id,
        name: formData.name,
        email: formData.email,
        message_type: formData.message_type,
        message: formData.message,
      })
      .select()
      .single() as { data: ContactSubmission | null; error: unknown };

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save submission: ${dbError.message}`);
    }

    const messageTypeLabels: Record<string, string> = {
      bug: "Bug Report",
      feature: "Feature Request",
      question: "Question",
      other: "Other",
    };

    const emailHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Type:</strong> ${messageTypeLabels[submission.message_type] || submission.message_type}</p>
      <p><strong>From:</strong> ${submission.name} (${submission.email})</p>
      <p><strong>User ID:</strong> ${submission.user_id || "Anonymous"}</p>
      <p><strong>Submitted:</strong> ${new Date(submission.created_at).toLocaleString()}</p>
      <hr />
      <h3>Message:</h3>
      <p>${submission.message.replace(/\n/g, "<br>")}</p>
      <hr />
      <p><small>Submission ID: ${submission.id}</small></p>
    `;

    const emailText = `
New Contact Form Submission

Type: ${messageTypeLabels[submission.message_type] || submission.message_type}
From: ${submission.name} (${submission.email})
User ID: ${submission.user_id || "Anonymous"}
Submitted: ${new Date(submission.created_at).toLocaleString()}

Message:
${submission.message}

---
Submission ID: ${submission.id}
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "TorahTutor <onboarding@resend.dev>",
        to: [adminEmail],
        reply_to: submission.email,
        subject: `[TorahTutor ${messageTypeLabels[submission.message_type]}] ${submission.name}`,
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
    console.error("Error sending contact email:", error);
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
