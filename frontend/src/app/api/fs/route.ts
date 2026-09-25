import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  
  if (!filePath) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to read file: ${error}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path: filePath, content } = await request.json();
    
    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (mkdirError) {
      // Directory might already exist
    }

    await fs.writeFile(filePath, content, 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: `Failed to write file: ${error}` }, { status: 500 });
  }
}
