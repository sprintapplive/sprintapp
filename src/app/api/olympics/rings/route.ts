import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/olympics/rings - Handle ring transactions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, amount } = await request.json();

    if (!action || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('golden_rings')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (action === 'deduct') {
      // Check if user has enough rings
      if (profile.golden_rings < amount) {
        return NextResponse.json({
          error: 'Insufficient rings',
          currentBalance: profile.golden_rings
        }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ golden_rings: profile.golden_rings - amount })
        .eq('id', user.id)
        .select('golden_rings')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        newBalance: data.golden_rings,
        deducted: amount
      });
    }

    if (action === 'add') {
      const { data, error } = await supabase
        .from('profiles')
        .update({ golden_rings: profile.golden_rings + amount })
        .eq('id', user.id)
        .select('golden_rings')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        newBalance: data.golden_rings,
        added: amount
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Olympics rings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/olympics/rings - Get current ring balance
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('golden_rings, status')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      golden_rings: profile.golden_rings,
      status: profile.status
    });
  } catch (error) {
    console.error('Olympics rings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
