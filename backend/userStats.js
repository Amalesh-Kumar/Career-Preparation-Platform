// backend/userStats.js
export const userStats = {}; // in-memory store (reset on server restart)

export function initializeUser(email = "anonymous") {
  if (!email) email = "anonymous";
  if (!userStats[email]) {
    userStats[email] = {
      resumesAnalyzed: 0,
      interviewsCompleted: 0,
      coursesEnrolled: 0,
      skillsImproved: 0,
      activity: [] // newest first
    };
  }
}

export function logActivity(email = "anonymous", action = "action") {
  initializeUser(email);
  userStats[email].activity.unshift({
    action,
    time: new Date().toISOString()
  });
  // Keep activity list reasonable length
  if (userStats[email].activity.length > 200) {
    userStats[email].activity.length = 200;
  }
}

export function incrementResume(email = "anonymous") {
  initializeUser(email);
  userStats[email].resumesAnalyzed++;
  logActivity(email, "Resume analyzed");
}

export function incrementInterview(email = "anonymous") {
  initializeUser(email);
  userStats[email].interviewsCompleted++;
  logActivity(email, "Completed a mock interview");
}

export function incrementCourse(email = "anonymous", courseName = "course") {
  initializeUser(email);
  userStats[email].coursesEnrolled++;
  logActivity(email, `Enrolled in course: ${courseName}`);
}

export function incrementSkill(email = "anonymous", skillName = "skill") {
  initializeUser(email);
  userStats[email].skillsImproved++;
  logActivity(email, `Improved skill: ${skillName}`);
}
