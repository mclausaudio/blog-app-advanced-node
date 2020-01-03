const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');

const Blog = mongoose.model('Blog');

module.exports = app => {
  app.get('/api/blogs/:id', requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id
    });

    res.send(blog);
  });

  app.get('/api/blogs', requireLogin, async (req, res) => {
    const redis = require('redis');
    const redisUrl = 'redis://127.0.0.1:6379';
    const client = redis.createClient(redisUrl);
    const util = require('util');

    // Do we have any cached data in redis related to this?
    // Out of the box, Redis doesn't support promises and only supports callback pattern
    // Can use NodeJS's util library to promisify client.get
    client.get = util.promisify(client.get);
    // We are overriding the old redis function with our promisified version so we can use async await
    const cachedBlogs = await client.get(req.user.id);
    // if yes, lets return redis cached data
    if(cachedBlogs){
      console.log('Serving from cache!')
      return res.send(JSON.parse(cachedBlogs));
    }

    // if no, respond to request and cache data
    const blogs = await Blog.find({ _user: req.user.id });
    console.log('Serving from MongoDB!')
    res.send(blogs);
    client.set(req.user.id, JSON.stringify(blogs));
  });

  app.post('/api/blogs', requireLogin, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }
  });
};
