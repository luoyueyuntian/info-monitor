alter table if exists sources
add column if not exists onboarding_status text not null default 'active';
