const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the questions with an added heading property
const testQuestionSchema = new Schema({
  heading: { type: String, required: true },
  type: { type: String, enum: ['multiple_choice', 'true_false', 'fill_in_the_blank'], required: true },
  question: { type: String, required: true },
  options: [{ type: String }],  // Only relevant for multiple choice questions
  correctAnswer: { type: String, required: true },
});

// Define the schema for the topics without a YouTube link
const testTopicSchema = new Schema({
  topicName: { type: String, required: true },
  information: { type: String, required: true },
  questions: [testQuestionSchema],
});

// Define the main test schema
const testSchema = new Schema({
  testName: { type: String, required: true },
  imageUri: { type: String, required: true },
  topics: [testTopicSchema]
});

// Compile and export our model
const Test = mongoose.model('Test', testSchema);

module.exports = Test;
