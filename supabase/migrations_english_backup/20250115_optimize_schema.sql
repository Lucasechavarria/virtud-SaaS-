-- ============================================
-- MIGRATION: Schema Optimization, Cleanup & Performance
-- Date: 2025-01-15
-- Description: 1. Removes legacy/duplicate tables to ensure data consistency.
--              2. Adds missing indexes for scalability.
-- ============================================

-- 0. CLEANUP LEGACY SYSTEM (The "Double System" Fix)
-- --------------------------------------------
-- Eliminate duplicate tables to avoid confusion.
-- We stick with: class_schedules & class_bookings.
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS classes CASCADE;

-- 1. BOOKINGS OPTIMIZATION
-- --------------------------------------------
-- Speed up "My Bookings" queries
CREATE INDEX IF NOT EXISTS idx_bookings_user ON class_bookings(user_id);

-- Speed up "Who is in this class?" queries
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON class_bookings(class_schedule_id);

-- Speed up "What fits in my calendar?" and Reporting queries
CREATE INDEX IF NOT EXISTS idx_bookings_date ON class_bookings(date);

-- Speed up "Attendance Rate" calculations
CREATE INDEX IF NOT EXISTS idx_bookings_status ON class_bookings(status);

-- 2. GAMIFICATION OPTIMIZATION
-- --------------------------------------------
-- Speed up Leaderboard generation (Critical for dashboard performance)
CREATE INDEX IF NOT EXISTS idx_gamification_points ON user_gamification(points DESC);

-- Speed up fetching user specific stats if not by PK
CREATE INDEX IF NOT EXISTS idx_gamification_streak ON user_gamification(current_streak DESC);

-- 3. SCHEDULE OPTIMIZATION
-- --------------------------------------------
-- Speed up filtering schedule by Activity Type (e.g. "Show me only Yoga")
CREATE INDEX IF NOT EXISTS idx_schedule_activity ON class_schedules(activity_id);
