-- Migration down: drop follows and follow_requests tables
DROP TABLE IF EXISTS follow_requests;
DROP TABLE IF EXISTS follows;
