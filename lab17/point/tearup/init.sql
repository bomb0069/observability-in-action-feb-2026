-- Use the database created by MySQL entrypoint (point_db)
USE point_db;

CREATE TABLE IF NOT EXISTS points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert seed data for 20 users
INSERT INTO points (user_id, points, description) VALUES
-- User 1-5
(1, 100, 'Welcome bonus'),
(1, 50, 'Purchase reward'),
(1, 25, 'Referral bonus'),
(2, 150, 'Welcome bonus'),
(2, 75, 'Purchase reward'),
(3, 200, 'Welcome bonus'),
(3, 100, 'Purchase reward'),
(3, 50, 'Survey completion'),
(4, 120, 'Welcome bonus'),
(4, 80, 'Purchase reward'),
(5, 90, 'Welcome bonus'),
(5, 45, 'Daily login'),
-- User 6-10
(6, 110, 'Welcome bonus'),
(6, 55, 'Purchase reward'),
(7, 130, 'Welcome bonus'),
(7, 65, 'Referral bonus'),
(8, 140, 'Welcome bonus'),
(8, 70, 'Purchase reward'),
(9, 160, 'Welcome bonus'),
(9, 85, 'Survey completion'),
(10, 95, 'Welcome bonus'),
(10, 40, 'Daily login'),
-- User 11-15
(11, 105, 'Welcome bonus'),
(11, 52, 'Purchase reward'),
(12, 125, 'Welcome bonus'),
(12, 60, 'Referral bonus'),
(13, 135, 'Welcome bonus'),
(13, 68, 'Purchase reward'),
(14, 145, 'Welcome bonus'),
(14, 72, 'Survey completion'),
(15, 155, 'Welcome bonus'),
(15, 78, 'Daily login'),
-- User 16-20
(16, 115, 'Welcome bonus'),
(16, 58, 'Purchase reward'),
(17, 165, 'Welcome bonus'),
(17, 82, 'Referral bonus'),
(18, 175, 'Welcome bonus'),
(18, 88, 'Purchase reward'),
(19, 185, 'Welcome bonus'),
(19, 92, 'Survey completion'),
(20, 195, 'Welcome bonus'),
(20, 98, 'Daily login');
