-- Create location_bookmarks table for storing map bookmarks
CREATE TABLE IF NOT EXISTS location_bookmarks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_location_bookmarks_created_at ON location_bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_bookmarks_user_id ON location_bookmarks(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE location_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON location_bookmarks;
DROP POLICY IF EXISTS "Enable read access for all users" ON location_bookmarks;
DROP POLICY IF EXISTS "Enable insert for all users" ON location_bookmarks;
DROP POLICY IF EXISTS "Enable update for all users" ON location_bookmarks;
DROP POLICY IF EXISTS "Enable delete for all users" ON location_bookmarks;

CREATE POLICY "read_own_bookmarks" ON location_bookmarks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "insert_own_bookmarks" ON location_bookmarks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_bookmarks" ON location_bookmarks
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_bookmarks" ON location_bookmarks
    FOR DELETE
    USING (auth.uid() = user_id);
