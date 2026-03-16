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

-- Insert seed data
INSERT INTO points (user_id, points, description) VALUES
(1, 100, 'Welcome bonus'),
(1, 50, 'Purchase reward'),
(1, 25, 'Referral bonus'),
(2, 150, 'Welcome bonus'),
(2, 75, 'Purchase reward'),
(3, 200, 'Welcome bonus'),
(3, 100, 'Purchase reward'),
(3, 50, 'Survey completion'),
(3, 30, 'Daily login');
