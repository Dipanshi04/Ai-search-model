INSERT INTO users (id, email, name, password_hash, role, "createdAt", "updatedAt") VALUES
('usr_admin01', 'admin@isamarathon.com', 'ISA Admin', '$2a$10$wU7i9RFCL6fT6gPHyFIl0OMDM1zDTVvx2xSwxElC46xuMxO9UTCrW', 'SUPER_ADMIN', NOW(), NOW());

INSERT INTO events (id, name, slug, description, date, status, "registrationOpen", "maxParticipants", "createdAt", "updatedAt") VALUES
('evt_main01', 'ISA Marathon 2026', 'isa-marathon-2026', 'Annual ISA Marathon in Indore', '2026-10-15', 'UPCOMING', true, 500, NOW(), NOW());

INSERT INTO race_distances (id, event_id, name, distance_km, status, total_distance, "createdAt", "updatedAt") VALUES
('rd_3k001', 'evt_main01', '3K Fun Run', 3, 'UPCOMING', 3.83, NOW(), NOW()),
('rd_5k001', 'evt_main01', '5K Challenge', 5, 'UPCOMING', 4.83, NOW(), NOW());

INSERT INTO route_points (id, race_distance_id, sequence, lat, lng, cum_distance, "createdAt") VALUES
('rp001', 'rd_5k001', 1,  22.7196, 75.8577, 0.00, NOW()),
('rp002', 'rd_5k001', 2,  22.7205, 75.8590, 0.18, NOW()),
('rp003', 'rd_5k001', 3,  22.7218, 75.8605, 0.40, NOW()),
('rp004', 'rd_5k001', 4,  22.7230, 75.8622, 0.65, NOW()),
('rp005', 'rd_5k001', 5,  22.7245, 75.8638, 0.90, NOW()),
('rp006', 'rd_5k001', 6,  22.7258, 75.8650, 1.12, NOW()),
('rp007', 'rd_5k001', 7,  22.7272, 75.8660, 1.32, NOW()),
('rp008', 'rd_5k001', 8,  22.7288, 75.8668, 1.52, NOW()),
('rp009', 'rd_5k001', 9,  22.7300, 75.8672, 1.68, NOW()),
('rp010', 'rd_5k001', 10, 22.7315, 75.8675, 1.86, NOW()),
('rp011', 'rd_5k001', 11, 22.7328, 75.8670, 2.04, NOW()),
('rp012', 'rd_5k001', 12, 22.7340, 75.8658, 2.26, NOW()),
('rp013', 'rd_5k001', 13, 22.7348, 75.8642, 2.46, NOW()),
('rp014', 'rd_5k001', 14, 22.7352, 75.8625, 2.64, NOW()),
('rp015', 'rd_5k001', 15, 22.7350, 75.8608, 2.82, NOW()),
('rp016', 'rd_5k001', 16, 22.7342, 75.8592, 3.02, NOW()),
('rp017', 'rd_5k001', 17, 22.7330, 75.8580, 3.22, NOW()),
('rp018', 'rd_5k001', 18, 22.7315, 75.8570, 3.42, NOW()),
('rp019', 'rd_5k001', 19, 22.7298, 75.8562, 3.62, NOW()),
('rp020', 'rd_5k001', 20, 22.7280, 75.8558, 3.82, NOW()),
('rp021', 'rd_5k001', 21, 22.7262, 75.8558, 4.02, NOW()),
('rp022', 'rd_5k001', 22, 22.7245, 75.8562, 4.22, NOW()),
('rp023', 'rd_5k001', 23, 22.7230, 75.8568, 4.40, NOW()),
('rp024', 'rd_5k001', 24, 22.7218, 75.8572, 4.56, NOW()),
('rp025', 'rd_5k001', 25, 22.7208, 75.8575, 4.68, NOW()),
('rp026', 'rd_5k001', 26, 22.7200, 75.8576, 4.78, NOW()),
('rp027', 'rd_5k001', 27, 22.7196, 75.8577, 4.83, NOW());

INSERT INTO route_points (id, race_distance_id, sequence, lat, lng, cum_distance, "createdAt") VALUES
('rp101', 'rd_3k001', 1,  22.7196, 75.8577, 0.00, NOW()),
('rp102', 'rd_3k001', 2,  22.7208, 75.8590, 0.18, NOW()),
('rp103', 'rd_3k001', 3,  22.7222, 75.8608, 0.40, NOW()),
('rp104', 'rd_3k001', 4,  22.7238, 75.8625, 0.65, NOW()),
('rp105', 'rd_3k001', 5,  22.7255, 75.8640, 0.92, NOW()),
('rp106', 'rd_3k001', 6,  22.7270, 75.8652, 1.16, NOW()),
('rp107', 'rd_3k001', 7,  22.7285, 75.8660, 1.38, NOW()),
('rp108', 'rd_3k001', 8,  22.7300, 75.8665, 1.58, NOW()),
('rp109', 'rd_3k001', 9,  22.7312, 75.8660, 1.75, NOW()),
('rp110', 'rd_3k001', 10, 22.7322, 75.8648, 1.92, NOW()),
('rp111', 'rd_3k001', 11, 22.7328, 75.8632, 2.10, NOW()),
('rp112', 'rd_3k001', 12, 22.7325, 75.8615, 2.28, NOW()),
('rp113', 'rd_3k001', 13, 22.7315, 75.8600, 2.48, NOW()),
('rp114', 'rd_3k001', 14, 22.7300, 75.8588, 2.68, NOW()),
('rp115', 'rd_3k001', 15, 22.7280, 75.8580, 2.90, NOW()),
('rp116', 'rd_3k001', 16, 22.7260, 75.8578, 3.12, NOW()),
('rp117', 'rd_3k001', 17, 22.7235, 75.8577, 3.38, NOW()),
('rp118', 'rd_3k001', 18, 22.7215, 75.8577, 3.60, NOW()),
('rp119', 'rd_3k001', 19, 22.7205, 75.8577, 3.72, NOW()),
('rp120', 'rd_3k001', 20, 22.7196, 75.8577, 3.83, NOW());
