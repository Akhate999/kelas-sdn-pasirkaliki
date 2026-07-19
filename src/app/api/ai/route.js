import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { prompt, maxTokens } = await request.json()

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key belum diatur di server.' }, { status: 500 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens || 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'Terjadi kesalahan pada AI.' }, { status: 500 })
    }

    const text = data.content?.[0]?.text || ''
    return NextResponse.json({ text })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
