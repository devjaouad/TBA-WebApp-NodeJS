'use strict';

var crypto;
var async = require('neo-async');
var passport = require('passport');
var moment = require('moment');
var UserRepo = require('../repositories/UserRepository.js');
var emailService = require('../services/emailService.js');

//get add violation
exports.getAddViolation = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  res.render('account/AddViolation', {
      title: 'Add Violation'});
};

//post add violation
exports.postAddViolation = function(req, res, next) {
  req.assert('date', 'Date connot be empty.').notEmpty();
  req.assert('date', 'Date is invalid.').isDate();
  req.assert('violation', 'Violation connot be empty.').notEmpty();
  req.assert('cost', 'Cost connot be empty.').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  UserRepo.createViolation({
      date: req.body.date,
      violation: req.body.violation.toUpperCase(),
      cost: req.body.cost,
      UserId: req.user.id
    })
    .then(function() {
        //flash success message and redirect to violations.ejs
        req.flash('success', {
          msg: 'Violation information successfully added!'
        });
        res.redirect('/AllViolations');
      })
      .catch(function(err) {
        console.log(err);
        req.flash('errors', {
          msg: err
        });
        res.redirect('back');
      });
};

//get update violation
exports.getUpdateViolation = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  res.render('account/UpdateViolation', {
      title: 'Update Violation'});
};

//post update violation
exports.postUpdateViolation = function(req, res, next) {
  var updatedFields = {
    id: req.body.violationid,
    date: req.body.date,
    violation: req.body.violation.toUpperCase(),
    cost: req.body.cost
  };
  UserRepo.UpdateViolation(updatedFields)
    .then(function() {
      req.flash('success', { msg: 'Violation information has been updated.' });
      res.redirect('/AllViolations');
      })
    .catch(function(err) {
      req.flash('errors', { msg: err });
      res.redirect('/back');
    });
};

//get all driver violations
exports.getAllViolations = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // if user not logged in reroute to acccess denied page
  // if user admin reroute to access denied page
  // retrieve all violations
  UserRepo.getViolations(req.user.id)
    .then(function(violations) {
      // display violation.ejs
      res.render('account/violations', {
        title: 'Violations',
        violations: violations,
        moment: moment,
      });
    })
    .catch(function(err) {
      console.log(err);
      res.redirect('/');
    });
};

//delete violation by id
exports.postDeleteViolation = function(req, res) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');

  // pass violation id (hidden form field) to sequelize function - removes
  // record from violations table
  UserRepo.removeViolationById(req.body.violationid)
    .then(function() {
      // flash success message and redirect to adas page
      req.flash('success', {
        msg: 'Violation deleted'
      });
      res.redirect('back');
    })
    .catch(function(err) {
      console.log(err);
      res.redirect('/');
    });
};

// search for violation by id
exports.postSearchViolation = function(req, res) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // retrieve violation by violation id and user id
     UserRepo.searchViolationById(req.user.id, req.body.violationid)
    .then(function(violations) {
      // display violation.ejs
      res.render('account/violations', {
        title: 'Violations',
        violations: violations,
        moment: moment,
      });

    })
    .catch(function(err) {
      console.log(err);
      res.redirect('back');

    });
};


// functionality for "View/Edit" button on taxis.ejs page
exports.postGoToEditViolation = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // async waterfall for displaying violations info
  // UpdateViolation.ejs
  async.waterfall([async.apply(fetchViolation, req.body.violationid)],

    function(err) {
      if (err) return next(err);
      console.log(err);
      res.redirect('/');

    });
    
    // pass violation ID to sequelize and return all patient record information
    // from violation table
  function fetchViolation(violationid, done) {
    UserRepo.getViolationById(violationid)
      .then(function(violation) {
        res.render('account/UpdateViolation', {
          title: 'Edit Violation',
          violation: violation,
          moment: moment,
        });
      })
      .catch(function(err) {
        done(err);
      });
  }
};