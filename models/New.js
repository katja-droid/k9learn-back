const mongoose = require('mongoose');

const newSchema = new mongoose.Schema({
  imageUrl: String,
  title: String,
  content: String
});

const New = mongoose.model('New', newSchema);

module.exports = New;
