create index if not exists stock_alerts_source_id_idx on public.stock_alerts (source_id);
create index if not exists live_wheel_chat_messages_sender_user_id_idx on public.live_wheel_chat_messages (sender_user_id);
create index if not exists sms_delivery_log_alert_id_idx on public.sms_delivery_log (alert_id);
create index if not exists shared_lists_user_id_idx on public.shared_lists (user_id);
