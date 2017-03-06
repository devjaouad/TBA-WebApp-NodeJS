'use strict';

var crypto;
var async = require('neo-async');
var passport = require('passport');

var UserRepo = require('../repositories/UserRepository.js');
var emailService = require('../services/emailService.js');


//user dashboard 
exports.getDashboard = function(req, res, next) {
  // if user not logged in reroute to acccess denied page
  // admin == 0, driver == 1
  if (!req.user || req.user.level != 0 )
  return res.render('access_denied', {
    title: 'Access Denied'
  });

  // retrieve all users
  UserRepo.getAllUsers()
    .then(function(users) {
      // display roles.ejs
      res.render('account/roles', {
        title: 'Admin Dashboard',
        users: users,
      });
    })
    .catch(function(err) {
      console.log(err);
      res.redirect('/');
    });
};