import { writeFileSync } from 'fs';
import { join } from 'path';

<<<<<<< HEAD
const SUPABASE_PROJECT_ID = 'igqupnhtbulncgokwbhe';
=======
const SUPABASE_PROJECT_ID = 'btdbvqsqzodkkwuojilr';
>>>>>>> b7894df8078cd44dd9b5d2b90c24436d3b548327
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function generateTypes() {
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is required');
    console.log('\nTo generate types:');
    console.log('1. Go to https://supabase.com/dashboard/account/tokens');
    console.log('2. Create a new access token');
    console.log('3. Run: SUPABASE_ACCESS_TOKEN=your_token npm run generate-types');
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
