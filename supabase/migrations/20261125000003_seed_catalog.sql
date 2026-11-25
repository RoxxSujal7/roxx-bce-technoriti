-- ============================================================================
-- ROXX BCE TECHNORITI — Migration 003: Official Catalog Seed
-- Sourced 100% from src/content/events.jsx (29 arenas) & Register.jsx/pricing-02.tsx
-- ============================================================================

INSERT INTO public.accommodation_plans (id, name, description, price_per_person_inr, is_active)
VALUES
  ('none', 'No Stay Needed', 'Day scholar / local commute', 0, true),
  ('lodging', 'Campus Lodging Only', 'Secure campus hostel bedding & 24/7 security', 50, true),
  ('mess', 'Mess & Dining Only', 'Breakfast, Lunch & Dinner in central college mess', 125, true),
  ('both', 'Complete Stay (Lodging + Mess)', 'Combined hostel stay + all 3 daily meals', 175, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_per_person_inr = EXCLUDED.price_per_person_inr,
  is_active = EXCLUDED.is_active;

INSERT INTO public.competitions (
  id, num_id, title, category, category_id, fee_type, fee_inr,
  additional_fee_scope, min_team_size, max_team_size, prize_pool,
  event_date, event_time, venue, is_active
) VALUES
  ('robowar', 1, 'RoboWar', 'Robotics & Hardware', 'robotics', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '10:00 AM', 'Robotics Arena, BCE Bhagalpur', true),
  ('robosoccer', 2, 'RoboSoccer', 'Robotics & Hardware', 'robotics', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '11:00 AM', 'Indoor Sports Complex, BCE Bhagalpur', true),
  ('dhanush', 3, 'Dhanush – LFR', 'Robotics & Hardware', 'robotics', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '10:30 AM', 'ECE Lab Hall, BCE Bhagalpur', true),
  ('matsya', 4, 'Matsya – AquaBot', 'Robotics & Hardware', 'robotics', 'per_team', 200, 'team', 1, 4, '₹5,000', 'December 2026', '02:00 PM', 'College Lake Arena, BCE Bhagalpur', true),
  ('electrotechnovation', 5, 'ElectroTechnovation', 'Robotics & Hardware', 'robotics', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '11:00 AM', 'Electrical Engineering Block', true),
  ('arduino', 6, 'Arduino Effect', 'Robotics & Hardware', 'robotics', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '01:30 PM', 'IoT & Embedded Lab, BCE Bhagalpur', true),
  ('boatmaking', 7, 'Boat Making Challenge', 'Robotics & Hardware', 'robotics', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '03:00 PM', 'Hydraulics Laboratory, BCE Bhagalpur', true),
  ('electronicsproject', 8, 'Electronics Project Exhibition', 'Robotics & Hardware', 'robotics', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '10:00 AM', 'Central Seminar Hall, BCE Bhagalpur', true),
  ('hackathon', 9, '36-Hour Hackathon', 'Coding & Cyber', 'coding', 'per_member', 50, 'single_delegate', 1, 3, '₹5,000', 'December 2026', '09:00 AM', 'Computer Center, BCE Bhagalpur', true),
  ('forensic', 10, 'Forensic Hackathon', 'Coding & Cyber', 'coding', 'per_member', 50, 'single_delegate', 2, 4, '₹5,000', 'December 2026', '11:00 AM', 'Cyber Forensics Lab, BCE Bhagalpur', true),
  ('competitive', 11, 'Competitive Programming', 'Coding & Cyber', 'coding', 'per_member', 50, 'single_delegate', 1, 3, '₹5,000', 'December 2026', '02:00 PM', 'Computer Center Lab 1', true),
  ('blindcoding', 12, 'Blind Coding', 'Coding & Cyber', 'coding', 'per_member', 100, 'single_delegate', 1, 1, '₹3,000', 'December 2026', '03:30 PM', 'Computer Center Lab 2', true),
  ('bughunting', 13, 'Bug Hunting', 'Coding & Cyber', 'coding', 'per_member', 50, 'single_delegate', 1, 2, '₹3,000', 'December 2026', '04:00 PM', 'Software Engineering Lab', true),
  ('memecircuit', 14, 'MeMe Circuit', 'Coding & Cyber', 'coding', 'per_member', 100, 'single_delegate', 1, 1, '₹3,000', 'December 2026', '01:00 PM', 'Multimedia Studio, BCE Bhagalpur', true),
  ('matlab', 15, 'MATLAB Simulation Challenge', 'Coding & Cyber', 'coding', 'per_member', 50, 'single_delegate', 1, 3, '₹5,000', 'December 2026', '02:30 PM', 'Simulation Center, BCE Bhagalpur', true),
  ('freefire', 16, 'Free-Fire Championship', 'Esports & Gaming', 'gaming', 'per_team', 300, 'team', 4, 4, '₹6,000', 'December 2026', '05:00 PM', 'Esports Arena (Online / LAN Stage)', true),
  ('echess', 17, 'E-Chess Tournament', 'Esports & Gaming', 'gaming', 'per_member', 100, 'single_delegate', 1, 1, '₹3,000', 'December 2026', '10:00 AM', 'Library Reading Hall, BCE Bhagalpur', true),
  ('bridgemaking', 18, 'Bridge Making Challenge', 'Design & Civil', 'design', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '10:30 AM', 'Civil Engineering Structural Lab', true),
  ('surveyking', 19, 'Survey King', 'Design & Civil', 'design', 'per_member', 50, 'single_delegate', 1, 1, '₹3,000', 'December 2026', '01:00 PM', 'Main Campus Field, BCE Bhagalpur', true),
  ('autocad', 20, 'AutoCAD Design Clash', 'Design & Civil', 'design', 'per_member', 100, 'single_delegate', 1, 1, '₹3,000', 'December 2026', '11:30 AM', 'CAD/CAM Laboratory, BCE Bhagalpur', true),
  ('solidworks', 21, 'SolidWorks 3D Challenge', 'Design & Civil', 'design', 'per_member', 50, 'single_delegate', 1, 3, '₹5,000', 'December 2026', '03:00 PM', 'Mechanical CAD Center', true),
  ('projectpresentation', 22, 'Project Presentation', 'Design & Civil', 'design', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '02:00 PM', 'Auditorium Hall B, BCE Bhagalpur', true),
  ('zerocarbon', 23, 'Zero Carbon Debate', 'Quizzes & Literary', 'quizzes', 'per_member', 50, 'single_delegate', 1, 3, '₹5,000', 'December 2026', '11:00 AM', 'Humanities Seminar Hall', true),
  ('cinematography', 24, 'Cinematography Contest', 'Quizzes & Literary', 'quizzes', 'per_member', 50, 'single_delegate', 1, 4, '₹5,000', 'December 2026', '04:00 PM', 'Auditorium Main Stage', true),
  ('photography', 25, 'Photography Contest', 'Quizzes & Literary', 'quizzes', 'per_member', 50, 'single_delegate', 1, 2, '₹3,000', 'December 2026', '02:00 PM', 'Open Air Gallery, BCE Bhagalpur', true),
  ('electromania', 26, 'ElectroMania Quiz', 'Quizzes & Literary', 'quizzes', 'per_team', 200, 'team', 2, 4, '₹5,000', 'December 2026', '12:00 PM', 'ECE Department Hall', true),
  ('nukkad', 27, 'Nukkad (Street Play)', 'Quizzes & Literary', 'quizzes', 'per_team', 200, 'team', 6, 15, '₹5,000', 'December 2026', '04:30 PM', 'Administrative Block Lawn', true),
  ('generalquiz', 28, 'General Quiz Challenge', 'Quizzes & Literary', 'quizzes', 'per_team', 100, 'team', 2, 3, '₹3,000', 'December 2026', '01:30 PM', 'Central Library Hall', true),
  ('scitechquiz', 29, 'SciTech Grand Quiz', 'Quizzes & Literary', 'quizzes', 'per_team', 100, 'team', 2, 3, '₹5,000', 'December 2026', '03:30 PM', 'Main Auditorium, BCE Bhagalpur', true)
ON CONFLICT (id) DO UPDATE SET
  num_id = EXCLUDED.num_id,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  category_id = EXCLUDED.category_id,
  fee_type = EXCLUDED.fee_type,
  fee_inr = EXCLUDED.fee_inr,
  additional_fee_scope = EXCLUDED.additional_fee_scope,
  min_team_size = EXCLUDED.min_team_size,
  max_team_size = EXCLUDED.max_team_size,
  prize_pool = EXCLUDED.prize_pool,
  event_date = EXCLUDED.event_date,
  event_time = EXCLUDED.event_time,
  venue = EXCLUDED.venue;
