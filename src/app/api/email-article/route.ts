import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

// Lazy initialization to avoid build errors when API key is not set
let resend: Resend | null = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function POST(request: NextRequest) {
  try {
    // Get current user's email
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, url, summary, source } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Article title is required' },
        { status: 400 }
      );
    }

    // Check if Resend API key is configured
    const emailClient = getResend();
    if (!emailClient) {
      return NextResponse.json(
        { error: 'Email service not configured. Add RESEND_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Send email
    const { data, error } = await emailClient.emails.send({
      from: 'Sprint <onboarding@resend.dev>', // Use your verified domain in production
      to: user.email,
      subject: `📰 Saved Article: ${title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">${title}</h1>

          ${source ? `<p style="color: #666; font-size: 14px; margin-bottom: 16px;">Source: ${source}</p>` : ''}

          ${summary ? `
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">${summary}</p>
            </div>
          ` : ''}

          ${url ? `
            <a href="${url}" style="display: inline-block; background: #4a6741; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Read Full Article
            </a>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="color: #999; font-size: 12px;">
            Saved from Sprint News on ${new Date().toLocaleDateString()}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
