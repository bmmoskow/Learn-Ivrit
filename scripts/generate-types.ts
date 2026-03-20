import { writeFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function generateTypes() {
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is required');
    console.log('\nTo generate types:');
    console.log('1. Go to https://supabase.com/dashboard/account/tokens');
    console.log('2. Create a new access token');
    console.log('3. Run: SUPABASE_ACCESS_TOKEN=your_token SUPABASE_PROJECT_ID=your_project_id npm run generate-types');
    process.exit(1);
  }

  if (!SUPABASE_PROJECT_ID) {
    console.error('Error: SUPABASE_PROJECT_ID environment variable is required');
    console.log('\nExtract the project ID from your VITE_SUPABASE_URL');
    console.log('Example: If URL is https://abc123.supabase.co, then project ID is abc123');
    console.log('Run: SUPABASE_ACCESS_TOKEN=your_token SUPABASE_PROJECT_ID=your_project_id npm run generate-types');
    process.exit(1);
  }

  try {
    console.log('Fetching schema from Supabase...');

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/types/typescript`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Response status:', response.status);
      console.error('Response body:', errorBody);
      throw new Error(`Failed to fetch types: ${response.statusText}`);
    }

    const types = await response.text();
    const outputPath = join(process.cwd(), 'supabase', 'types.ts');

    writeFileSync(outputPath, types, 'utf-8');
    console.log(`✓ Types generated successfully at: ${outputPath}`);
  } catch (error) {
    console.error('Error generating types:', error);
    process.exit(1);
  }
}

generateTypes();
