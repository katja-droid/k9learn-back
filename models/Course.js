const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the questions
const questionSchema = new Schema({
  type: { type: String, enum: ['multiple_choice', 'true_false', 'fill_in_the_blank'], required: true },
  question: { type: String, required: true },
  options: [{ type: String }],  // Only relevant for multiple choice questions
  correctAnswer: { type: String, required: true },
});

// Define the schema for the topics
const topicSchema = new Schema({
  youTubeLink: { type: String },
  topicName: { type: String, required: true },
  information: { type: String, required: true },
  questions: [questionSchema],
  imageUrl: { type: String }
});

// Define the main course schema
const courseSchema = new Schema({
  courseName: { type: String, required: true },
  imageUri: { type: String, required: true },
  topics: [topicSchema]
});

// Compile and export our model
const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
