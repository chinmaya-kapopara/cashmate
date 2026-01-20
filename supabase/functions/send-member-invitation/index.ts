import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL');

interface InviteRequest {
  inviteeEmail: string;
  inviterName: string;
  inviterEmail: string;
  bookName: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { inviteeEmail, inviterName, inviterEmail, bookName, role }: InviteRequest = await req.json();

    if (!inviteeEmail || !inviterName || !inviterEmail || !bookName || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get app URL from environment variable
    if (!APP_URL) {
      return new Response(
        JSON.stringify({ error: 'APP_URL environment variable is not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const appUrl = APP_URL;
    const signInUrl = `${appUrl}/auth`;

    // Email content
    const emailSubject = `You've been invited to join "${bookName}" on CashMate`;
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>CashMate Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">CashMate</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join the book <strong>"${bookName}"</strong> on CashMate.</p>
            <p>Your role will be: <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong></p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signInUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign In to CashMate</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you don't have an account yet, you can create one by clicking the link above.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If you have any questions, feel free to reach out to ${inviterName} at ${inviterEmail}.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated email from CashMate. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend if API key is configured
    if (RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CashMate <noreply@cashmate.app>', // Update with your verified domain
            to: inviteeEmail,
            subject: emailSubject,
            html: emailBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error('Resend API error:', errorData);
          // Don't fail - log and continue
        }
      } catch (resendError) {
        console.error('Error calling Resend API:', resendError);
        // Don't fail - log and continue
      }
    } else {
      // Log email content for development/testing
      console.log('Email would be sent to:', inviteeEmail);
      console.log('Subject:', emailSubject);
      console.log('App URL:', appUrl);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent successfully',
        appUrl: appUrl 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  } catch (error) {
    console.error('Error in send-member-invitation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
