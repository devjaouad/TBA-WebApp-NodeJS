"use strict";

var emailService = require('../services/emailService.js');

/**
 * GET /contact
 * Contact form page.
 */
exports.getContact = function(req, res) {
  res.render('contact', {
    title: 'Contact'
  });
};

/**
 * POST /contact
 * Send a contact form via Sendgrid.
 */
exports.postContact = function(req, res) {
  req.assert('name', 'Name cannot be blank').notEmpty();
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('message', 'Message cannot be blank').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/contact');
  }
   emailService.contactUs(req.body.name, req.body.email,req.body.subject,
   req.body.message, function(err){
    req.flash('success', { msg: 'Thank you for your interest. We will contact you soon.' });
    res.redirect('/contact');
    console.log(err);
   });
};

/**
 * GET /about
 * About page.
 */
exports.getAbout = function(req, res) {
  res.render('about', {
    title: 'About'
  });
};