// models/User.js
import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  action: String,
  time: String,
  icon: String,
  color: String,
});

const statsSchema = new mongoose.Schema({
  resumes: { type: Number, default: 0 },
  interviews: { type: Number, default: 0 },
  courses: { type: Number, default: 0 },
  skills: { type: Number, default: 0 },
  activities: { type: [activitySchema], default: [] },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  stats: { type: statsSchema, default: () => ({}) },
});

export default mongoose.models.User || mongoose.model("User", userSchema);
