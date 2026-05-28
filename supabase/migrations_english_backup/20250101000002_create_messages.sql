-- Create messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    receiver_id UUID REFERENCES profiles(id) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages" ON messages
    FOR SELECT TO authenticated
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Users can insert messages if they are the sender
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- Users can update message status (read) if they are the receiver
CREATE POLICY "Receivers can mark messages as read" ON messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- Views for Chat Inbox (Latest message per conversation)
-- This is complex in standard SQL, usually handled in application logic or a specific function
-- but a view helps.
-- For now we rely on simple queries.
