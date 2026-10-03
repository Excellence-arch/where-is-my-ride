-- Run once against DATABASE_URL (already applied to the Neon project).
CREATE TABLE IF NOT EXISTS rider_trips (
  waybill_id    text PRIMARY KEY,
  rider_name    text NOT NULL,
  status        text NOT NULL DEFAULT 'idle',      -- idle | en_route | delivered
  lat           double precision,
  lng           double precision,
  accuracy_m    double precision,
  speed_mps     double precision,
  heading       double precision,
  landmark      text,
  landmark_lat  double precision,
  landmark_lng  double precision,
  dest_lat      double precision,
  dest_lng      double precision,
  dest_label    text,
  demo_dest     boolean NOT NULL DEFAULT false,
  simulated     boolean NOT NULL DEFAULT false,
  geofence_hit_at timestamptz,
  started_at    timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  delivered_at  timestamptz
);

CREATE TABLE IF NOT EXISTS app_state (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
