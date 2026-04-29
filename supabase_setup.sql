-- =============================================
-- ExamGuard Database Setup
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usn TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  branch TEXT,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  marks INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 1,
  exam_identity TEXT,
  branch TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Exam status (one row per student)
CREATE TABLE IF NOT EXISTS exam_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usn TEXT UNIQUE NOT NULL,
  student_name TEXT,
  branch TEXT,
  status TEXT DEFAULT 'not_started',
  score INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  wrong INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  warnings INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 39,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Violations table
CREATE TABLE IF NOT EXISTS violations (
  id SERIAL PRIMARY KEY,
  usn TEXT NOT NULL,
  student_name TEXT,
  type TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Student answers
CREATE TABLE IF NOT EXISTS student_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usn TEXT NOT NULL,
  question_id uuid NOT NULL,
  answer TEXT,
  UNIQUE(usn, question_id)
);

-- 6. Exam config (single row)
CREATE TABLE IF NOT EXISTS exam_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT DEFAULT 'IP NEXUS EXAM',
  duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT false,
  marks_per_question INTEGER DEFAULT 1,
  negative_marks INTEGER DEFAULT 0,
  shuffle_questions BOOLEAN DEFAULT false,
  shuffle_options BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO exam_config (title, duration_minutes, is_active)
VALUES ('IP NEXUS EXAM', 30, false)
ON CONFLICT DO NOTHING;

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE exam_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- Questions readable by everyone
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_readable" ON questions FOR SELECT USING (true);

-- exam_config readable by everyone
ALTER TABLE exam_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_readable" ON exam_config FOR SELECT USING (true);

-- =============================================
-- Enable Realtime
-- =============================================
-- Go to Supabase > Database > Replication
-- Enable these tables in supabase_realtime publication:
-- exam_status, violations, exam_config

