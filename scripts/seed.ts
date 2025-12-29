/**
 * DEVELOPMENT SEED SCRIPT
 * 
 * ⚠️ WARNING: This script is for DEVELOPMENT/DEMO purposes only.
 * Do NOT run this in production.
 * 
 * This script creates:
 * - 1 Admin user
 * - 1 Approved Coach user
 * - 1 Client user
 * - Coach-Client assignment
 * - 14+ days of attendance records
 * - 1 structured workout plan
 * - 1 structured diet plan
 * - 2-3 coach notes
 * 
 * Usage:
 *   SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key npm run seed
 *   or
 *   SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key bun run seed
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { Database } from '../src/integrations/supabase/types';

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('Example: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npm run seed');
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface SeedUsers {
  admin: { id: string; email: string };
  coach: { id: string; email: string };
  client: { id: string; email: string };
}

async function createUsers(): Promise<SeedUsers> {
  console.log('📝 Creating seed users...');

  // Create Admin user
  let adminUser;
  const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@fitconnect.demo',
    password: 'demo123456',
    email_confirm: true,
    user_metadata: {
      full_name: 'Admin User',
      role: 'admin',
    },
  });

  if (adminError) {
    // User might already exist, try to get existing user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users.find(u => u.email === 'admin@fitconnect.demo');
    if (!existingAdmin) {
      throw new Error(`Failed to create admin: ${adminError.message}`);
    }
    adminUser = existingAdmin;
    console.log('✓ Admin user (existing)');
  } else {
    adminUser = adminData.user!;
    console.log('✓ Admin user created');
  }

  // Update admin role
  await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: adminUser.id, role: 'admin' }, { onConflict: 'user_id,role' });

  // Create Coach user
  let coachUser;
  const { data: coachData, error: coachError } = await supabaseAdmin.auth.admin.createUser({
    email: 'coach@fitconnect.demo',
    password: 'demo123456',
    email_confirm: true,
    user_metadata: {
      full_name: 'Sarah Johnson',
      role: 'coach',
    },
  });

  if (coachError) {
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingCoach = existingUsers?.users.find(u => u.email === 'coach@fitconnect.demo');
    if (!existingCoach) {
      throw new Error(`Failed to create coach: ${coachError.message}`);
    }
    coachUser = existingCoach;
    console.log('✓ Coach user (existing)');
  } else {
    coachUser = coachData.user!;
    console.log('✓ Coach user created');
  }

  // Update coach role and profile
  await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: coachUser.id, role: 'coach' }, { onConflict: 'user_id,role' });

  await supabaseAdmin
    .from('coach_profiles')
    .upsert({
      user_id: coachUser.id,
      bio: 'Certified personal trainer with 8 years of experience helping clients achieve their fitness goals.',
      specialties: ['Strength Training', 'Weight Loss', 'Muscle Building'],
      experience_years: 8,
      training_philosophy: 'I believe in sustainable, progressive training that adapts to each client\'s unique needs and lifestyle.',
      is_active: true,
      is_approved: true,
    }, { onConflict: 'user_id' });

  // Update coach profile name
  await supabaseAdmin
    .from('profiles')
    .update({ full_name: 'Sarah Johnson' })
    .eq('user_id', coachUser.id);

  // Create Client user
  let clientUser;
  const { data: clientData, error: clientError } = await supabaseAdmin.auth.admin.createUser({
    email: 'client@fitconnect.demo',
    password: 'demo123456',
    email_confirm: true,
    user_metadata: {
      full_name: 'John Doe',
      role: 'client',
    },
  });

  if (clientError) {
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingClient = existingUsers?.users.find(u => u.email === 'client@fitconnect.demo');
    if (!existingClient) {
      throw new Error(`Failed to create client: ${clientError.message}`);
    }
    clientUser = existingClient;
    console.log('✓ Client user (existing)');
  } else {
    clientUser = clientData.user!;
    console.log('✓ Client user created');
  }

  // Update client role and profile
  await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: clientUser.id, role: 'client' }, { onConflict: 'user_id,role' });

  await supabaseAdmin
    .from('client_profiles')
    .upsert({
      user_id: clientUser.id,
      age: 32,
      height_cm: 180,
      weight_kg: 85,
      goal: 'Build muscle and increase strength',
    }, { onConflict: 'user_id' });

  // Update client profile name
  await supabaseAdmin
    .from('profiles')
    .update({ full_name: 'John Doe' })
    .eq('user_id', clientUser.id);

  return {
    admin: { id: adminUser.id, email: adminUser.email! },
    coach: { id: coachUser.id, email: coachUser.email! },
    client: { id: clientUser.id, email: clientUser.email! },
  };
}

async function createCoachClientAssignment(coachId: string, clientId: string) {
  console.log('🔗 Creating coach-client assignment...');
  
  await supabaseAdmin
    .from('coach_client_assignments')
    .upsert({
      coach_id: coachId,
      client_id: clientId,
      is_active: true,
    }, { onConflict: 'coach_id,client_id' });

  console.log('✓ Coach-client assignment created');
}

async function createAttendanceRecords(clientId: string) {
  console.log('📅 Creating attendance records...');

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get last 14 days (or all days in current month if less than 14)
  const daysToSeed = daysInMonth.slice(-14);
  
  const statuses: Array<'trained' | 'rest' | 'missed'> = ['trained', 'rest', 'missed'];
  const records = daysToSeed.map((day, index) => {
    // Create a pattern: mostly trained, some rest, occasional missed
    let status: 'trained' | 'rest' | 'missed';
    const dayOfWeek = day.getDay();
    
    if (index % 7 === 6) {
      // Every 7th day is rest
      status = 'rest';
    } else if (index % 10 === 9) {
      // Every 10th day is missed
      status = 'missed';
    } else {
      // Otherwise trained
      status = 'trained';
    }

    return {
      user_id: clientId,
      date: format(day, 'yyyy-MM-dd'),
      status,
      notes: status === 'trained' ? 'Great workout session' : status === 'rest' ? 'Rest day' : null,
    };
  });

  // Insert attendance records
  for (const record of records) {
    await supabaseAdmin
      .from('attendance')
      .upsert(record, { onConflict: 'user_id,date' });
  }

  console.log(`✓ Created ${records.length} attendance records`);
}

async function createWorkoutPlan(coachId: string, clientId: string) {
  console.log('🏋️ Creating workout plan...');

  const structuredData = [
    {
      day: 'Day 1 - Upper Body',
      exercises: [
        { name: 'Bench Press', sets: '4', reps: '8-10', rest: '90s' },
        { name: 'Bent-Over Rows', sets: '4', reps: '8-10', rest: '90s' },
        { name: 'Overhead Press', sets: '3', reps: '10-12', rest: '60s' },
        { name: 'Pull-Ups', sets: '3', reps: '8-10', rest: '60s' },
        { name: 'Bicep Curls', sets: '3', reps: '12-15', rest: '45s' },
      ],
    },
    {
      day: 'Day 2 - Lower Body',
      exercises: [
        { name: 'Squats', sets: '4', reps: '8-10', rest: '120s' },
        { name: 'Romanian Deadlifts', sets: '4', reps: '8-10', rest: '90s' },
        { name: 'Leg Press', sets: '3', reps: '12-15', rest: '60s' },
        { name: 'Walking Lunges', sets: '3', reps: '12 each leg', rest: '60s' },
        { name: 'Calf Raises', sets: '4', reps: '15-20', rest: '45s' },
      ],
    },
    {
      day: 'Day 3 - Rest',
      exercises: [],
    },
    {
      day: 'Day 4 - Push Focus',
      exercises: [
        { name: 'Incline Dumbbell Press', sets: '4', reps: '10-12', rest: '90s' },
        { name: 'Dumbbell Shoulder Press', sets: '3', reps: '10-12', rest: '60s' },
        { name: 'Tricep Dips', sets: '3', reps: '10-12', rest: '60s' },
        { name: 'Lateral Raises', sets: '3', reps: '12-15', rest: '45s' },
      ],
    },
    {
      day: 'Day 5 - Pull Focus',
      exercises: [
        { name: 'Deadlifts', sets: '4', reps: '5-6', rest: '120s' },
        { name: 'Lat Pulldowns', sets: '4', reps: '10-12', rest: '90s' },
        { name: 'Cable Rows', sets: '3', reps: '10-12', rest: '60s' },
        { name: 'Face Pulls', sets: '3', reps: '15-20', rest: '45s' },
        { name: 'Hammer Curls', sets: '3', reps: '12-15', rest: '45s' },
      ],
    },
  ];

  // Deactivate any existing active plan
  await supabaseAdmin
    .from('workout_plans')
    .update({ is_active: false })
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .eq('is_active', true);

  await supabaseAdmin.from('workout_plans').insert({
    coach_id: coachId,
    client_id: clientId,
    title: 'Beginner Strength Program',
    plan_type: 'structured',
    structured_data: structuredData as unknown,
    version: 1,
    is_active: true,
  });

  console.log('✓ Workout plan created');
}

async function createDietPlan(coachId: string, clientId: string) {
  console.log('🥗 Creating diet plan...');

  const structuredData = [
    {
      meal: 'Breakfast',
      foods: [
        { name: 'Oatmeal', amount: '1 cup cooked', calories: '150' },
        { name: 'Banana', amount: '1 medium', calories: '105' },
        { name: 'Greek Yogurt', amount: '1 cup', calories: '130' },
        { name: 'Almonds', amount: '1/4 cup', calories: '200' },
      ],
      description: 'High-protein breakfast to fuel your morning workout',
    },
    {
      meal: 'Lunch',
      foods: [
        { name: 'Grilled Chicken Breast', amount: '6 oz', calories: '280' },
        { name: 'Brown Rice', amount: '1 cup cooked', calories: '220' },
        { name: 'Steamed Broccoli', amount: '1 cup', calories: '55' },
        { name: 'Olive Oil', amount: '1 tbsp', calories: '120' },
      ],
      description: 'Balanced meal with lean protein and complex carbs',
    },
    {
      meal: 'Snack',
      foods: [
        { name: 'Protein Shake', amount: '1 scoop', calories: '120' },
        { name: 'Apple', amount: '1 medium', calories: '95' },
      ],
      description: 'Post-workout recovery snack',
    },
    {
      meal: 'Dinner',
      foods: [
        { name: 'Salmon', amount: '6 oz', calories: '350' },
        { name: 'Sweet Potato', amount: '1 medium', calories: '180' },
        { name: 'Asparagus', amount: '1 cup', calories: '40' },
        { name: 'Avocado', amount: '1/2 medium', calories: '120' },
      ],
      description: 'Omega-3 rich dinner for recovery',
    },
  ];

  // Deactivate any existing active plan
  await supabaseAdmin
    .from('diet_plans')
    .update({ is_active: false })
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .eq('is_active', true);

  await supabaseAdmin.from('diet_plans').insert({
    coach_id: coachId,
    client_id: clientId,
    title: 'High Protein Meal Plan',
    plan_type: 'structured',
    structured_data: structuredData as unknown,
    version: 1,
    is_active: true,
  });

  console.log('✓ Diet plan created');
}

async function createCoachNotes(coachId: string, clientId: string) {
  console.log('📝 Creating coach notes...');

  const notes = [
    {
      coach_id: coachId,
      client_id: clientId,
      content: 'Client is showing great progress with the strength program. Form is improving on compound movements. Consider increasing weight on bench press next week.',
    },
    {
      coach_id: coachId,
      client_id: clientId,
      content: 'Discussed nutrition goals. Client is tracking meals well. Need to focus on increasing protein intake during lunch.',
    },
    {
      coach_id: coachId,
      client_id: clientId,
      content: 'Noticed client missed 2 workouts this week. Follow up on schedule and motivation. May need to adjust program to better fit their lifestyle.',
    },
  ];

  // Insert notes with slight time differences
  for (let i = 0; i < notes.length; i++) {
    const noteDate = subDays(new Date(), notes.length - i);
    await supabaseAdmin.from('coach_notes').insert({
      ...notes[i],
      created_at: noteDate.toISOString(),
      updated_at: noteDate.toISOString(),
    });
  }

  console.log(`✓ Created ${notes.length} coach notes`);
}

async function main() {
  console.log('🌱 Starting seed data creation...\n');

  try {
    // Create users
    const users = await createUsers();
    console.log('');

    // Create coach-client assignment
    await createCoachClientAssignment(users.coach.id, users.client.id);
    console.log('');

    // Create attendance records
    await createAttendanceRecords(users.client.id);
    console.log('');

    // Create workout plan
    await createWorkoutPlan(users.coach.id, users.client.id);
    console.log('');

    // Create diet plan
    await createDietPlan(users.coach.id, users.client.id);
    console.log('');

    // Create coach notes
    await createCoachNotes(users.coach.id, users.client.id);
    console.log('');

    console.log('✅ Seed data creation completed successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('   Admin: admin@fitconnect.demo / demo123456');
    console.log('   Coach: coach@fitconnect.demo / demo123456');
    console.log('   Client: client@fitconnect.demo / demo123456');
    console.log('\n⚠️  Remember: These are DEMO credentials. Change passwords in production!');
  } catch (error) {
    console.error('❌ Error creating seed data:', error);
    process.exit(1);
  }
}

main();

