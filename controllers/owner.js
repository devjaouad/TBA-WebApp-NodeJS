'use strict';

var crypto;
var async = require('neo-async');
var passport = require('passport');
var moment = require('moment');
var UserRepo = require('../repositories/UserRepository.js');
var emailService = require('../services/emailService.js');


//get owner
exports.getAddOwner = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  res.render('account/AddOwner',{
    title: 'Add New Garage'
  });
};

exports.postAddOwner = function(req, res, next) {
  req.assert('company', 'Company connot be empty.').notEmpty();
  req.assert('street', 'Street connot be empty.').notEmpty();
  req.assert('city', 'City connot be empty.').notEmpty();
  req.assert('state', 'State connot be empty').notEmpty();
  req.assert('zipcode', 'Zip code connot be empty.').notEmpty();
  req.assert('phone', 'Phone cannot be empty.').notEmpty();


  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  UserRepo.createOwner({
      company: req.body.company.toUpperCase(),
      street: req.body.street.toUpperCase(),
      city: req.body.city.toUpperCase(),
      state: req.body.state.toUpperCase(),
      zipcode: req.body.zipcode,
      phone: req.body.phone,
      UserId: req.user.id
    })
    .then(function() {
        //flash success message and redirect to adas.ejs
        req.flash('success', {
          msg: 'Garage information successfully added!'
        });
        res.redirect('/AllOwners');
      })
      .catch(function(err) {
        console.log(err);
        req.flash('errors', {
          msg: err
        });
        res.redirect('back');
      });
   
  };

//get update owner
exports.getUpdateOwner = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  res.render('account/UpdateOwner', {
    title: 'Update Garage'});
};

//post update owner
exports.postUpdateOwner = function(req, res, next) {
	var updatedFields = {
    id: req.body.ownerid,
    company: req.body.company.toUpperCase(),
    street: req.body.street.toUpperCase(),
    city: req.body.city.toUpperCase(),
    state: req.body.state.toUpperCase(),
    zipcode: req.body.zipcode,
    phone: req.body.phone
  };
  UserRepo.UpdateOwner(updatedFields)
    .then(function() {
      req.flash('success', { msg: 'Garage information has been updated.' });
      res.redirect('/AllOwners');
      })
    .catch(function(err) {
      req.flash('errors', { msg: err });
      res.redirect('/back');
    });
};

//get all owners
exports.getAllOwners =  function(req, res, next) {
  // if user not logged in reroute to acccess denied page
  // if user admin reroute to access denied page
  if (!req.user)
    return res.redirect('/');
  // retrieve all owners
  UserRepo.getOwners(req.user.id)
    .then(function(owners) {
      // display owners.ejs
      res.render('account/owners', {
        title: 'Garages',
        owners: owners,
      });
    })
    .catch(function(err) {
      console.log(err);
      res.redirect('/');
    });
};

  //delete owner
  exports.postDeleteOwner = function(req, res) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // pass owner id (hidden form field) to sequelize function - removes
  // record from owner table
  UserRepo.removeOwnerById(req.body.ownerid)
    .then(function() {
      // flash success message and redirect to owners page
      req.flash('success', {
        msg: 'Garage deleted'
      });
      res.redirect('back');
    })
    .catch(function(err) {
      console.log(err);
      res.redirect('/');
    });
};

// search for owner by id
exports.postSearchOwner = function(req, res) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // retrieve owner by owner id and user id
     UserRepo.searchOwnerById(req.body.ownerid, req.user.id)
    .then(function(owners) {
      // display owners.ejs
      res.render('account/owners', {
        title: 'Garages',
        owners: owners
      });

    })
    .catch(function(err) {
      console.log(err);
      res.redirect('back');

    });
};

// functionality for "View/Edit" button on owners.ejs page
exports.postGoToEditOwner = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // async waterfall for displaying owner info and associated slides on
  // UpdateOwner.ejs
  async.waterfall([async.apply(fetchOwner, req.body.ownerid)],

    function(err) {
      if (err) return next(err);
      console.log(err);
      res.redirect('/');

    });
    // pass owner ID to sequelize and return all patient record information
    // from owner table
  function fetchOwner(ownerid, done) {
    UserRepo.getOwnerById(ownerid)
      .then(function(owner) {
        res.render('account/UpdateOwner', {
          title: 'Edit Garage',
          owner: owner,
        });
      })
      .catch(function(err) {
        done(err);
      });
  }
};
