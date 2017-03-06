'use strict';

var crypto;
var async = require('neo-async');
var passport = require('passport');
var moment = require('moment');
var UserRepo = require('../repositories/UserRepository.js');
var emailService = require('../services/emailService.js');

//get Add taxi income
exports.getAddTaxi = function(req, res, next) {
  // if user not logged in reroute to acccess denied page
  // if user admin reroute to access denied page
  if (!req.user)
    return res.redirect('/');
  // retrieve all owners
  UserRepo.getOwners(req.user.id)
    .then(function(owners) {
      // display owners.ejs
      res.render('account/AddTaxi', {
        title: 'Add Shift Report',
        owners: owners,
      });
    })
    .catch(function(err) {
      console.log(err);
      res.redirect('/');
    });
};


//post taxi income
exports.postAddTaxi = function(req, res, next) {
  req.assert('date', 'Date connot be empty.').notEmpty();
  req.assert('date', 'Date is invalid.').isDate();
  req.assert('week', 'Week cannot be empty.').notEmpty();
  req.assert('medallion', 'Medallion connot be empty').notEmpty();
  req.assert('company', 'Company connot be empty.').notEmpty();
  

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }
  //return mta tax total
  function mtatax(){
  var totalTrips = Number(req.body.cashtrips) + Number(req.body.cctrips);
  var mtatax = Number(totalTrips) * 0.8;
  return mtatax;
  }

  UserRepo.createTaxi({
      date: req.body.date,
      week: req.body.week,
      medallion: req.body.medallion.toUpperCase(),
      ownerId: req.body.company,
      cashtrips: req.body.cashtrips,
      cashincome: req.body.cashincome,
      cctrips: req.body.cctrips,
      ccincome: req.body.ccincome,
      ezpass: req.body.ezpass,
      mtatax: mtatax(),
      leasefee: req.body.leasefee,
      checks: req.body.checks,
      miles: req.body.miles,
      gas: req.body.gas,
      cashtips: req.body.cashtips,
      UserId: req.user.id
    })
    .then(function() {
        //flash success message and redirect to adas.ejs
        req.flash('success', {
          msg: 'Shift Report information successfully added!'
        });
        res.redirect('/TaxiIncome');
      })
      .catch(function(err) {
        console.log(err);
        req.flash('errors', {
          msg: err
        });
        res.redirect('back');
      });
};

//get update taxi
exports.getUpdateTaxi = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  res.render('account/UpdateTaxi', {
      title: 'Update Shift Report'});
};

//post taxi income update
exports.postUpdateTaxi = function(req, res, next) {
 var updatedFields = {
    id: req.body.taxiid,
    date: req.body.date,
    //date: moment(req.body.date).format('MM/DD/YYYY'),
    week: req.body.week,
    medallion: req.body.medallion.toUpperCase(),
    ownerId: req.body.ownerid,
    cashtrips: req.body.cashtrips,
    cashincome: req.body.cashincome,
    cctrips: req.body.cctrips,
    ccincome: req.body.ccincome,
    ezpass: req.body.ezpass,
    leasefee: req.body.leasefee,
    checks: req.body.checks,
    miles: req.body.miles,
    gas: req.body.gas,
    cashtips: req.body.cashtips
  };
  UserRepo.UpdateTaxi(updatedFields)
    .then(function() {
      req.flash('success', { msg: 'Shift Report information has been updated.' });
      res.redirect('/TaxiIncome');
      })
    .catch(function(err) {
      req.flash('errors', { msg: err });
      res.redirect('/back');
    });
};

//get all taxi income
exports.getAllTaxiIncome = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // if user not logged in reroute to acccess denied page
  // if user admin reroute to access denied page
  // retrieve all taxi income
  UserRepo.getTaxis(req.user.id)
    .then(function(taxis) {
      // display vioaTaiIncome.ejs
      res.render('account/viewTaxiIncome', {
        title: 'Taxi Income',
        taxis: taxis,
        moment: moment,
      });
    })
    .catch(function(err) {
      console.log(err);
      res.redirect('/');
    });
};

//get all taxi income
exports.getTaxiWeeklyIncome = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // if user not logged in reroute to acccess denied page
  // if user admin reroute to access denied page
  // retrieve all taxi income
  UserRepo.getWeeklyIncome(req.user.id)
    .then(function(taxis) {
      // display weeklyIncome.ejs
      res.render('account/weeklyIncome', {
        title: 'Weekly Income',
        taxis: taxis,
      });
    })
    .catch(function(err) {
      console.log('taxi.js: ' + err);
      res.redirect('/');
    });
};

//get all taxi income
exports.getTaxiGrandTotal = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // if user not logged in reroute to acccess denied page
  // if user admin reroute to access denied page
  // retrieve all taxi income
  UserRepo.getGrandTotal(req.user.id, req.body.year)
    .then(function(taxis) {
      // display grandTotal.ejs
      res.render('account/grandTotal', {
        title: 'Daily Income',
        taxis: taxis,
        moment: moment,
      });
    })
    .catch(function(err) {
      console.log('taxi.js: ' + err);
      res.redirect('/');
    });
};

//get weekly income
exports.getWeeklyIncome = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  res.render('account/weeklyIncome', {
      title: 'Weekly Income'});
};

// delte taxi record
exports.postDeleteTaxi = function(req, res) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');

  // pass taxi id (hidden form field) to sequelize function - removes
  // record from taxis table
  UserRepo.removeTaxiById(req.body.taxiid)
    .then(function() {
      // flash success message and redirect to taxis page
      req.flash('success', {
        msg: 'Shift Report deleted'
      });
      res.redirect('back');
    })
    .catch(function(err) {
      console.log(err);
      res.redirect('/');
    });
};

// search for taxi by week
exports.postSearchTaxi = function(req, res) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // retrieve taxi by week
     UserRepo.searchTaxiByWeek(req.body.weekid, req.user.id)
    .then(function(taxis) {
      // display viewTaxiIncome.ejs
      res.render('account/viewTaxiIncome', {
        title: 'Shift Reports',
        taxis: taxis,
        moment: moment,
      });

    })
    .catch(function(err) {
      console.log(err);
      res.redirect('back');

    });
};

// search for taxi by week
exports.postSearchWeeklyIncome = function(req, res) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // retrieve taxi by week
     UserRepo.searchTaxiByWeekAndGroupBy(req.user.id, req.body.weekid)
    .then(function(taxis) {
      // display weeklyIncome.ejs
      res.render('account/weeklyIncome', {
        title: 'weekly Income',
        taxis: taxis,
        moment: moment,
      });

    })
    .catch(function(err) {
      console.log(err);
      res.redirect('back');

    });
};


// search for taxi by year
exports.postSearchYearlyIncome = function(req, res) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // retrieve taxi by year
     UserRepo.searchTaxiByYearAndGroupBy(req.user.id, req.body.yearid)
    .then(function(taxis) {
      // display grandTotal.ejs
      res.render('account/grandTotal', {
        title: 'Daily Income',
        taxis: taxis,
        moment: moment,
      });

    })
    .catch(function(err) {
      console.log(err);
      res.redirect('back');

    });
};

// functionality for "View/Edit" button on taxis.ejs page
exports.postGoToEditTaxi = function(req, res, next) {
  // if user not logged in reroute to index page
  if (!req.user)
    return res.redirect('/');
  // async waterfall for displaying taxi income info
  // UpdateTaxi.ejs
  async.waterfall([async.apply(fetchTaxi, req.body.taxiid)],

    function(err) {
      if (err) return next(err);
      console.log(err);
      res.redirect('/');

    });
    
    // pass taxi ID to sequelize and return all patient record information
    // from taxi table
  function fetchTaxi(taxiid, done) {
    UserRepo.getOwners(req.user.id)
    .then(function(owners){
      owners:owners
    });
    UserRepo.getTaxiById(taxiid)
      .then(function(taxi) {
        res.render('account/UpdateTaxi', {
          title: 'Edit Shift Report',
          taxi: taxi,
          moment: moment,
        });
      })
      .catch(function(err) {
        done(err);
      });
  }
};