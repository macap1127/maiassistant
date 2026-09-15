SELECT cron.schedule(
  'signup-reminders-daily',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kdrtvdkmggscyrkmxhws.supabase.co/functions/v1/send-signup-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnR2ZGttZ2dzY3lya214aHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTcwNDIsImV4cCI6MjA5MjM5MzA0Mn0.JKJ_ggldCgXcvi0_3a1XF-Ka57zANfnqsRZmdLXcC80'
    ),
    body := '{}'::jsonb
  );
  $$
);
