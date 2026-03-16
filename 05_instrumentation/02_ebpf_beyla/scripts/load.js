import http from "k6/http";
import { sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // Ramp up to 10 users
    { duration: "1m", target: 10 }, // Stay at 10 users
    { duration: "30s", target: 0 }, // Ramp down to 0 users
  ],
};

export default function load_() {
  // Generate random user IDs between 1 and 5
  const userId = Math.floor(Math.random() * 5) + 1;

  // Call the user endpoint which will make a distributed call to point service
  const response = http.get(
    `http://host.docker.internal:8080/api/v1/users/${userId}`,
  );

  // Check response
  if (response.status !== 200 && response.status !== 500) {
    console.log(`Unexpected status: ${response.status} for user ${userId}`);
  }

  sleep(1);
}
