-- Enable real-time for call_sessions table
ALTER TABLE call_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;