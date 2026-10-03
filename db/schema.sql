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

-- Registration (customers and riders), added with the sign-up flows.
ALTER TABLE rider_trips ADD COLUMN IF NOT EXISTS rider_phone text, ADD COLUMN IF NOT EXISTS vehicle text;

CREATE TABLE IF NOT EXISTS customers (
  phone      text PRIMARY KEY,   -- last 10 digits, e.g. 8035550142
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS riders (
  phone        text PRIMARY KEY, -- last 10 digits
  name         text NOT NULL,
  vehicle_type text NOT NULL,
  plate        text NOT NULL,
  waybill_id   text,             -- delivery the rider has picked up
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
