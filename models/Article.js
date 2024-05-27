const mongoose = require('mongoose');

const newSchema = new mongoose.Schema({
    imageUrl: String,
  imageUrls: [String], // Changed to an array of strings
  title: String,
  content: String
});

const Article = mongoose.model('Article', newSchema);

module.exports = Article;
