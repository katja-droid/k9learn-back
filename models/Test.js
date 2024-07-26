const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const testQuestionSchema = new Schema({
  heading: { type: String, required: true },
  type: { type: String, enum: ['multiple_choice', 'true_false', 'fill_in_the_blank'], required: true },
  question: { type: String, required: true },
  options: [{ type: String }],  // Only relevant for multiple choice questions
  correctAnswer: { type: String, required: true },
});

const testTopicSchema = new Schema({
  topicName: { type: String, required: true },
  information: { type: String, required: true },
  questions: [testQuestionSchema],
});

const testSchema = new Schema({
  testName: { type: String, required: true },
  imageUri: { type: String, required: true },
  topics: [testTopicSchema]
});

const Test = mongoose.model('Test', testSchema);

module.exports = Test;
